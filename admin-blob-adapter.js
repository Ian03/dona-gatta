const adminApi = async (action, options = {}) => {
  let response;
  try {
    response = await fetch(`/api/index.php?action=${encodeURIComponent(action)}`, { credentials: 'same-origin', ...options });
  } catch (error) {
    throw new Error('Não foi possível acessar a API do painel. Confirme se a aplicação Node.js está ativa na hospedagem.');
  }
  const responseText = await response.text();
  let body;
  try { body = responseText ? JSON.parse(responseText) : {}; }
  catch {
    throw new Error('A API do painel não respondeu em JSON. Confirme se o site está rodando pelo server.js na aplicação Node.js da hospedagem.');
  }
  if (!response.ok) throw new Error(body.error || `Falha na API do painel (HTTP ${response.status}).`);
  return body;
};

class HostingerAdminQuery {
  constructor(table) { this.table = table; this.operation = 'select'; this.filters = []; }
  select() { return this; }
  order(column, options = {}) { this.orderBy = [column, options.ascending !== false]; return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  in(column, values) { this.filters.push([column, values, true]); return this; }
  single() { this.returnSingle = true; return this; }
  insert(value) { this.operation = 'insert'; this.payload = value; return this; }
  update(value) { this.operation = 'update'; this.payload = value; return this; }
  delete() { this.operation = 'delete'; return this; }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  async execute() {
    try {
      const catalog = await adminApi('catalog');
      const collections = catalog.collections || [];
      let rows = this.table === 'colecoes' ? collections : collections.flatMap(item => item.variacoes || []);
      const matches = row => this.filters.every(([key, value, many]) => many
        ? value.map(String).includes(String(row[key]))
        : String(row[key]) === String(value));
      if (this.operation === 'select') {
        rows = rows.filter(matches);
        if (this.orderBy) {
          const [key, ascending] = this.orderBy;
          rows.sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || '')) * (ascending ? 1 : -1));
        }
        return { data: this.returnSingle ? rows[0] || null : rows, error: null };
      }
      let result = null;
      if (this.table === 'colecoes') {
        if (this.operation === 'insert') {
          result = { ...(this.payload[0] || {}), id: crypto.randomUUID(), created_at: new Date().toISOString(), variacoes: [] };
          collections.unshift(result);
        } else if (this.operation === 'update') {
          const target = collections.find(matches);
          if (!target) throw new Error('Coleção não encontrada.');
          Object.assign(target, this.payload);
        } else if (this.operation === 'delete') {
          const index = collections.findIndex(matches);
          if (index < 0) throw new Error('Coleção não encontrada.');
          collections.splice(index, 1);
        }
      } else if (this.operation === 'insert') {
        const value = this.payload[0] || {};
        const collection = collections.find(item => String(item.id) === String(value.colecao_id));
        if (!collection) throw new Error('Coleção não encontrada.');
        result = { ...value, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        (collection.variacoes ||= []).push(result);
      } else {
        let found = false;
        for (const collection of collections) {
          const variations = collection.variacoes || [];
          const selected = variations.filter(matches);
          if (!selected.length) continue;
          found = true;
          if (this.operation === 'update') selected.forEach(item => Object.assign(item, this.payload));
          if (this.operation === 'delete') collection.variacoes = variations.filter(item => !matches(item));
        }
        if (!found && this.operation !== 'delete') throw new Error('Variação não encontrada.');
      }
      await adminApi('catalog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collections }) });
      return { data: result, error: null };
    } catch (error) { return { data: null, error }; }
  }
}

window.supabaseClient = {
  auth: {
    async signInWithPassword({ email, password }) {
      try {
        await adminApi('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        return { data: { user: { email: 'admin@donagatta.com' } }, error: null };
      } catch (error) { return { data: null, error }; }
    },
    async signOut() {
      try { await adminApi('logout', { method: 'POST' }); return { error: null }; }
      catch (error) { return { error }; }
    },
    async getSession() {
      try {
        const { authenticated } = await adminApi('session');
        return { data: { session: authenticated ? { user: { email: 'admin@donagatta.com' } } : null }, error: null };
      } catch (error) { return { data: { session: null }, error }; }
    }
  },
  from(table) { return new HostingerAdminQuery(table); },
  storage: {
    from(bucket) {
      let uploadedUrl = null;
      return {
        async upload(path, file) {
          const form = new FormData();
          form.append('bucket', bucket);
          form.append('path', path);
          form.append('file', file);
          try {
            const result = await adminApi('upload', { method: 'POST', body: form });
            uploadedUrl = result.url;
            return { data: { path: result.path, publicUrl: result.url }, error: null };
          } catch (error) { return { data: null, error }; }
        },
        getPublicUrl(path) {
          const publicUrl = uploadedUrl || `/uploads/${String(path || '').split('/').map(encodeURIComponent).join('/')}`;
          return { data: { publicUrl } };
        }
      };
    }
  }
};
