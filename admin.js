document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const adminApp = document.getElementById('adminApp');
    const loginError = document.getElementById('loginError');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');
    const logoutBtn = document.getElementById('logoutBtn');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const newCollectionBtn = document.getElementById('newCollectionBtn');
    const backToCollections = document.getElementById('backToCollections');
    const addVariationBtn = document.getElementById('addVariationBtn');
    const variationsContainer = document.getElementById('variationsContainer');
    const collectionForm = document.getElementById('collectionForm');
    const collectionsGrid = document.getElementById('collectionsGrid');
    const colName = document.getElementById('colName');
    const colEyebrow = document.getElementById('colEyebrow');
    const colIntroText = document.getElementById('colIntroText');
    const colInstallments = document.getElementById('colInstallments');
    const colCover = document.getElementById('colCover');
    const coverPreview = document.getElementById('coverPreview');
    const editViewTitle = document.getElementById('editViewTitle');
    const pdfCollectionSelect = document.getElementById('pdfCollectionSelect');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const defaultCollectionEyebrow = 'Coleção Verão';
    const defaultCollectionIntro = 'Escolha a sua variação favorita e consulte a disponibilidade com a nossa equipe.';
    const allowedAdminEmail = 'admin@donagatta.com';
    const maxImageSizeBytes = 5 * 1024 * 1024;
    const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

    let editingCollection = null;
    let coverFile = null;
    let removedVariationIds = new Set();

    const defaultCoverPreview = () => {
        coverPreview.replaceChildren();
        const icon = document.createElement('i');
        icon.className = 'fas fa-cloud-upload-alt';
        const text = document.createElement('p');
        text.textContent = 'Clique para selecionar a capa';
        coverPreview.append(icon, text);
    };

    const showImagePreview = (container, source, className = '') => {
        container.replaceChildren();
        const image = document.createElement('img');
        image.src = source;
        image.alt = 'Prévia da imagem';
        image.className = className;
        container.append(image);
    };

    function validateImageFile(file, fieldLabel) {
        if (!file) return true;

        if (!allowedImageTypes.has(file.type)) {
            alert(`${fieldLabel}: envie apenas arquivos JPG, PNG ou WEBP.`);
            return false;
        }

        if (file.size > maxImageSizeBytes) {
            alert(`${fieldLabel}: o arquivo excede o limite de 5 MB.`);
            return false;
        }

        return true;
    }

    function showView(viewId) {
        document.querySelectorAll('.view-section').forEach(section => section.style.display = 'none');
        document.getElementById(viewId).style.display = 'block';
    }

    function formatBrazilianPrice(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    function parseBrazilianPrice(value) {
        if (value == null) return NaN;
        const normalized = String(value)
            .replace(/\s+/g, '')
            .replace(/[R$r$\u00A0]/g, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^0-9.-]/g, '');
        return Number(normalized);
    }

    function clampInstallments(value) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 5;
        return Math.min(12, Math.max(1, parsed));
    }

    function buildInstallmentLabel(value) {
        const installments = clampInstallments(value);
        return `Até ${installments}x${installments <= 5 ? ' sem juros' : ''}`;
    }

    function showAdminApp() {
        loginModal.style.display = 'none';
        adminApp.style.display = 'flex';
    }

    function showLogin() {
        adminApp.style.display = 'none';
        loginModal.style.display = 'flex';
    }

    function resetEditor() {
        editingCollection = null;
        coverFile = null;
        removedVariationIds = new Set();
        collectionForm.reset();
        colEyebrow.value = defaultCollectionEyebrow;
        colIntroText.value = defaultCollectionIntro;
        colInstallments.value = '5';
        variationsContainer.replaceChildren();
        defaultCoverPreview();
    }

    function openNewCollection() {
        resetEditor();
        editViewTitle.textContent = 'Nova Coleção';
        showView('editCollectionView');
    }

    function createVariationItem(variation = null) {
        const isExisting = Boolean(variation?.id);
        const item = document.createElement('div');
        item.className = 'variation-item';
        if (isExisting) {
            item.dataset.variationId = variation.id;
            item.dataset.existingImageUrl = variation.imagem_url || '';
        }

        const upload = document.createElement('div');
        upload.className = 'variation-img-upload';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.className = 'file-input var-file';
        fileInput.accept = 'image/*';
        fileInput.required = !isExisting;
        const preview = document.createElement('div');
        preview.className = 'upload-placeholder var-preview';
        upload.append(fileInput, preview);

        if (variation?.imagem_url) {
            showImagePreview(preview, variation.imagem_url);
        } else {
            const icon = document.createElement('i');
            icon.className = 'fas fa-camera';
            preview.append(icon);
        }

        const details = document.createElement('div');
        details.className = 'variation-details';
        details.innerHTML = `
            <div class="form-group full-width"><label>Descrição</label><input type="text" class="var-desc" required></div>
            <div class="form-group"><label>Valor à vista (com desconto)</label><input type="text" class="var-vista" required></div>
            <div class="form-group"><label>Valor parcelado</label><input type="text" class="var-parcelado" required></div>
        `;
        details.querySelector('.var-desc').value = variation?.descricao || '';
        details.querySelector('.var-vista').value = variation?.valor_vista || '';
        details.querySelector('.var-parcelado').value = variation?.valor_parcelado || '';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-variation';
        removeButton.setAttribute('aria-label', 'Remover variação');
        removeButton.innerHTML = '<i class="fas fa-trash"></i>';

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            if (!validateImageFile(file, 'Imagem da variação')) {
                fileInput.value = '';
                return;
            }
            showImagePreview(preview, URL.createObjectURL(file));
        });
        removeButton.addEventListener('click', () => {
            if (item.dataset.variationId) removedVariationIds.add(item.dataset.variationId);
            item.remove();
        });

        item.append(upload, details, removeButton);
        variationsContainer.append(item);
    }

    async function uploadImage(file, pathFolder) {
        if (!file) return null;
        const extension = file.name.split('.').pop();
        const fileName = `${Date.now()}_${crypto.randomUUID()}.${extension}`;
        const filePath = `${pathFolder}/${fileName}`;
        const { error } = await supabaseClient.storage.from('produtos').upload(filePath, file);
        if (error) throw error;
        return supabaseClient.storage.from('produtos').getPublicUrl(filePath).data.publicUrl;
    }

    async function openCollectionEditor(id) {
        const { data: collection, error } = await supabaseClient
            .from('colecoes')
            .select('*, variacoes(*)')
            .eq('id', id)
            .single();

        if (error || !collection) {
            console.error(error);
            alert('Não foi possível carregar esta coleção.');
            return;
        }

        resetEditor();
        editingCollection = collection;
        editViewTitle.textContent = `Editar coleção: ${collection.nome}`;
        colName.value = collection.nome || '';
        colEyebrow.value = collection.catalogo_eyebrow ?? defaultCollectionEyebrow;
        colIntroText.value = collection.catalogo_intro ?? defaultCollectionIntro;
        colInstallments.value = String(clampInstallments(collection.parcelamento_maximo));
        if (collection.capa_url) showImagePreview(coverPreview, collection.capa_url, 'cover-image');
        (collection.variacoes || []).forEach(createVariationItem);
        showView('editCollectionView');
    }

    async function saveCollection(event) {
        event.preventDefault();
        const submitButton = collectionForm.querySelector('button[type="submit"]');
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitButton.disabled = true;

        try {
            const nome = colName.value.trim();
            const catalogo_eyebrow = colEyebrow.value.trim();
            const catalogo_intro = colIntroText.value.trim();
            const parcelamento_maximo = clampInstallments(colInstallments.value);
            let capaUrl = editingCollection?.capa_url || '';
            if (coverFile) capaUrl = await uploadImage(coverFile, 'capas');

            let collectionId = editingCollection?.id;
            if (collectionId) {
                const { error } = await supabaseClient
                    .from('colecoes')
                    .update({ nome, capa_url: capaUrl, catalogo_eyebrow, catalogo_intro, parcelamento_maximo })
                    .eq('id', collectionId);
                if (error) throw error;
            } else {
                const { data, error } = await supabaseClient
                    .from('colecoes')
                    .insert([{ nome, capa_url: capaUrl, catalogo_eyebrow, catalogo_intro, parcelamento_maximo }])
                    .select('id')
                    .single();
                if (error) throw error;
                collectionId = data.id;
            }

            if (removedVariationIds.size) {
                const { error } = await supabaseClient
                    .from('variacoes')
                    .delete()
                    .in('id', [...removedVariationIds]);
                if (error) throw error;
            }

            for (const item of variationsContainer.querySelectorAll('.variation-item')) {
                const file = item.querySelector('.var-file').files[0];
                const descricao = item.querySelector('.var-desc').value.trim();
                const valor_vista = item.querySelector('.var-vista').value.trim();
                const valor_parcelado = item.querySelector('.var-parcelado').value.trim();
                let imagem_url = item.dataset.existingImageUrl || '';
                if (file) imagem_url = await uploadImage(file, 'variacoes');

                if (item.dataset.variationId) {
                    const { error } = await supabaseClient
                        .from('variacoes')
                        .update({ imagem_url, descricao, valor_vista, valor_parcelado })
                        .eq('id', item.dataset.variationId);
                    if (error) throw error;
                } else {
                    const { error } = await supabaseClient.from('variacoes').insert([{
                        colecao_id: collectionId,
                        imagem_url,
                        descricao,
                        valor_vista,
                        valor_parcelado
                    }]);
                    if (error) throw error;
                }
            }

            alert(editingCollection ? 'Coleção atualizada com sucesso!' : 'Coleção criada com sucesso!');
            await loadCollections();
            showView('collectionsView');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar a coleção. Verifique o console.');
        } finally {
            submitButton.innerHTML = 'Salvar Coleção';
            submitButton.disabled = false;
        }
    }

    async function loadCollections() {
        if (!supabaseClient) return;
        collectionsGrid.textContent = 'Carregando coleções...';
        const { data, error } = await supabaseClient
            .from('colecoes')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error(error);
            collectionsGrid.textContent = 'Não foi possível carregar as coleções.';
            return;
        }

        pdfCollectionSelect.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Selecione uma coleção';
        pdfCollectionSelect.append(placeholder);

        collectionsGrid.replaceChildren();
        if (!data?.length) {
            collectionsGrid.textContent = 'Nenhuma coleção criada ainda.';
            return;
        }

        data.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection.id;
            option.textContent = collection.nome;
            pdfCollectionSelect.append(option);

            const card = document.createElement('article');
            card.className = 'collection-card';
            const image = document.createElement('div');
            image.className = 'card-img';
            if (collection.capa_url) image.style.backgroundImage = `url("${collection.capa_url}")`;
            const info = document.createElement('div');
            info.className = 'card-info';
            const name = document.createElement('h4');
            name.textContent = collection.nome;
            const actions = document.createElement('div');
            actions.className = 'card-actions';
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'btn-primary btn-sm';
            edit.innerHTML = '<i class="fas fa-pen"></i> Editar';
            edit.addEventListener('click', () => openCollectionEditor(collection.id));
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'btn-secondary btn-sm';
            remove.style.color = 'var(--error-color)';
            remove.setAttribute('aria-label', `Excluir ${collection.nome}`);
            remove.innerHTML = '<i class="fas fa-trash"></i>';
            remove.addEventListener('click', () => deleteCollection(collection.id));
            actions.append(edit, remove);
            info.append(name, actions);
            card.append(image, info);
            collectionsGrid.append(card);
        });
    }

    async function deleteCollection(id) {
        if (!confirm('Tem certeza que deseja excluir esta coleção?')) return;
        const { error } = await supabaseClient.from('colecoes').delete().eq('id', id);
        if (error) {
            console.error(error);
            alert('Não foi possível excluir a coleção.');
            return;
        }
        await loadCollections();
    }

    function buildPdfMarkup(selectedCollection, groupedCollections) {
        const groupName = (selectedCollection.catalogo_eyebrow || defaultCollectionEyebrow).trim() || defaultCollectionEyebrow;
        const groupIntro = (selectedCollection.catalogo_intro || defaultCollectionIntro).trim() || defaultCollectionIntro;
        const cards = groupedCollections.flatMap(collection => {
            const installmentLabel = buildInstallmentLabel(collection.parcelamento_maximo);
            return (collection.variacoes || []).map((variation, index) => {
                const parcelado = parseBrazilianPrice(variation.valor_parcelado);
                const vista = parseBrazilianPrice(variation.valor_vista);
                const savings = Number.isFinite(parcelado) && Number.isFinite(vista) && parcelado >= vista
                    ? parcelado - vista
                    : 0;

                return `
                    <article class="pdf-card">
                        <div class="pdf-image-wrap">
                            ${variation.imagem_url ? `<img src="${variation.imagem_url}" alt="${collection.nome} - ${variation.descricao || `Variação ${index + 1}`}">` : '<div class="pdf-image-fallback">Sem imagem</div>'}
                        </div>
                        <div class="pdf-card-body">
                            <div class="pdf-model-name">${collection.nome}</div>
                            <div class="pdf-variation-name">${variation.descricao || `Variação ${index + 1}`}</div>
                            <div class="pdf-price-box pdf-price-box-featured">
                                <span class="pdf-price-label">Parcelado</span>
                                <strong class="pdf-price-value">${installmentLabel}</strong>
                            </div>
                            <div class="pdf-price-box pdf-price-box-pix">
                                <span class="pdf-price-label">À vista no Pix</span>
                                <strong class="pdf-price-value">${variation.valor_vista || 'Consulte'}</strong>
                                <span class="pdf-price-note">${savings > 0 ? `Economize ${formatBrazilianPrice(savings)} no Pix` : 'Consulte o melhor valor à vista'}</span>
                            </div>
                        </div>
                    </article>
                `;
            });
        }).join('');

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${groupName} - PDF</title>
    <style>
        :root{--wine:#401010;--cream:#fbf4ee;--text:#3d2020;--line:#e8d7c8;--gold:#b9853d;--pix:#f7eee5}
        *{box-sizing:border-box}
        body{margin:0;font-family:Arial,sans-serif;background:var(--cream);color:var(--text)}
        .pdf-shell{padding:32px}
        .pdf-header{display:grid;grid-template-columns:1.1fr .9fr;gap:26px;align-items:center;margin-bottom:28px}
        .pdf-header-copy{padding:20px 0}
        .pdf-eyebrow{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:#7a5740}
        .pdf-title{font-family:Georgia,serif;font-size:44px;line-height:.9;margin:14px 0 18px;color:var(--wine)}
        .pdf-intro{font-size:16px;line-height:1.65;max-width:520px}
        .pdf-cover img{width:100%;max-height:360px;object-fit:cover;border:1px solid var(--line)}
        .pdf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
        .pdf-card{background:#fffaf6;border:1px solid var(--line);page-break-inside:avoid}
        .pdf-image-wrap{aspect-ratio:4/5;background:#efe3d7;overflow:hidden}
        .pdf-image-wrap img{width:100%;height:100%;object-fit:cover}
        .pdf-image-fallback{display:grid;place-items:center;height:100%;color:#7a5740}
        .pdf-card-body{padding:16px}
        .pdf-model-name{font-size:14px;letter-spacing:.16em;text-transform:uppercase}
        .pdf-variation-name{margin-top:6px;color:#7a5740;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
        .pdf-price-box{display:grid;gap:4px;padding:10px 12px;border-radius:12px;margin-top:12px;border:1px solid var(--line)}
        .pdf-price-box-featured{background:linear-gradient(135deg,var(--wine),#5b1a1a);border-color:rgba(64,16,16,.9)}
        .pdf-price-box-pix{background:var(--pix)}
        .pdf-price-label{font-size:9px;letter-spacing:.18em;text-transform:uppercase}
        .pdf-price-box-featured .pdf-price-label{color:#ecdccf}
        .pdf-price-box-pix .pdf-price-label{color:#7c5b49}
        .pdf-price-value{font-size:19px;line-height:1.05}
        .pdf-price-box-featured .pdf-price-value{color:#fff}
        .pdf-price-box-pix .pdf-price-value{color:var(--wine)}
        .pdf-price-note{font-size:10px;line-height:1.4}
        .pdf-price-box-featured .pdf-price-note{color:#e8cdbd}
        .pdf-price-box-pix .pdf-price-note{color:#8b5a1d;font-weight:600}
        .pdf-footer{margin-top:24px;padding-top:14px;border-top:1px solid var(--line);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7a5740}
        @page{size:A4;margin:14mm}
        @media print {.pdf-shell{padding:0}.pdf-header{margin-bottom:18px}.pdf-grid{gap:14px}}
    </style>
</head>
<body>
    <div class="pdf-shell">
        <section class="pdf-header">
            <div class="pdf-header-copy">
                <div class="pdf-eyebrow">Grupo da coleção</div>
                <h1 class="pdf-title">${groupName}</h1>
                <p class="pdf-intro">${groupIntro}</p>
            </div>
            <div class="pdf-cover">
                ${selectedCollection.capa_url ? `<img src="${selectedCollection.capa_url}" alt="${groupName}">` : ''}
            </div>
        </section>
        <section class="pdf-grid">${cards}</section>
        <footer class="pdf-footer">Dona Gatta · Catálogo de coleção</footer>
    </div>
    <script>
        window.addEventListener('load', () => {
            setTimeout(() => window.print(), 300);
        });
    </script>
</body>
</html>`;
    }

    async function exportCollectionToPdf() {
        const collectionId = pdfCollectionSelect.value;
        if (!collectionId) {
            alert('Selecione uma coleção para exportar.');
            return;
        }

        exportPdfBtn.disabled = true;
        const originalHtml = exportPdfBtn.innerHTML;
        exportPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando PDF...';

        try {
            const { data: collection, error } = await supabaseClient
                .from('colecoes')
                .select('*, variacoes(*)')
                .eq('id', collectionId)
                .single();

            if (error || !collection) throw error || new Error('Coleção não encontrada.');

            const groupName = (collection.catalogo_eyebrow || defaultCollectionEyebrow).trim() || defaultCollectionEyebrow;

            const { data: groupedCollections, error: groupedError } = await supabaseClient
                .from('colecoes')
                .select('*, variacoes(*)')
                .eq('catalogo_eyebrow', groupName)
                .order('created_at', { ascending: false });

            if (groupedError || !groupedCollections?.length) {
                throw groupedError || new Error('Não foi possível carregar o grupo da coleção para exportação.');
            }

            const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
            if (!popup) throw new Error('O navegador bloqueou a janela de exportação. Libere pop-ups para continuar.');

            popup.document.open();
            popup.document.write(buildPdfMarkup(collection, groupedCollections));
            popup.document.close();
        } catch (error) {
            console.error(error);
            alert(error.message || 'Não foi possível exportar a coleção em PDF.');
        } finally {
            exportPdfBtn.disabled = false;
            exportPdfBtn.innerHTML = originalHtml;
        }
    }

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        loginError.textContent = '';
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonHtml = submitButton.innerHTML;
        submitButton.innerHTML = '<span>Entrando...</span><i class="fas fa-arrow-right"></i>';
        submitButton.disabled = true;

        try {
            const email = document.getElementById('username').value.trim().toLowerCase();
            const password = passwordInput.value;
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;

            const signedEmail = data.user?.email?.toLowerCase();
            if (signedEmail !== allowedAdminEmail) {
                await supabaseClient.auth.signOut();
                throw new Error('Este usuário não tem permissão para acessar o painel.');
            }

            showAdminApp();
            await loadCollections();
        } catch (error) {
            console.error(error);
            loginError.textContent = error.message === 'Invalid login credentials'
                ? 'Email ou senha incorretos.'
                : error.message;
        } finally {
            submitButton.innerHTML = originalButtonHtml;
            submitButton.disabled = false;
        }
    });
    passwordToggle?.addEventListener('click', () => {
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        passwordToggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
        passwordToggle.setAttribute('aria-pressed', String(show));
        passwordToggle.innerHTML = show ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
    logoutBtn.addEventListener('click', async event => {
        event.preventDefault();
        await supabaseClient.auth.signOut();
        showLogin();
        loginForm.reset();
        loginError.textContent = '';
        resetEditor();
    });
    toggleSidebar.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('collapsed');
        toggleSidebar.setAttribute('aria-expanded', String(!collapsed));
        toggleSidebar.setAttribute('aria-label', collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral');
    });
    document.querySelectorAll('.sidebar-nav a[data-target]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const target = link.dataset.target;
            document.querySelectorAll('.sidebar-nav li').forEach(item => item.classList.remove('active'));
            link.closest('li').classList.add('active');
            const titleByTarget = {
                dashboard: 'Visão geral das coleções',
                collections: 'Gerenciador de Coleções',
                pdfExport: 'Exportar coleção para PDF'
            };
            document.getElementById('pageTitle').textContent = titleByTarget[target] || 'Painel Administrativo';
            const targetViewByMenu = {
                dashboard: 'collectionsView',
                collections: 'collectionsView',
                pdfExport: 'pdfExportView'
            };
            showView(targetViewByMenu[target] || 'collectionsView');
            loadCollections();
        });
    });
    newCollectionBtn.addEventListener('click', openNewCollection);
    backToCollections.addEventListener('click', () => showView('collectionsView'));
    addVariationBtn.addEventListener('click', () => createVariationItem());
    colCover.addEventListener('change', () => {
        coverFile = colCover.files[0] || null;
        if (!coverFile) return;
        if (!validateImageFile(coverFile, 'Imagem de capa')) {
            colCover.value = '';
            coverFile = null;
            defaultCoverPreview();
            return;
        }
        showImagePreview(coverPreview, URL.createObjectURL(coverFile), 'cover-image');
    });
    collectionForm.addEventListener('submit', saveCollection);
    exportPdfBtn.addEventListener('click', exportCollectionToPdf);

    (async () => {
        if (!supabaseClient) {
            loginError.textContent = 'Falha ao iniciar o login.';
            return;
        }

        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error(error);
            return;
        }

        const sessionEmail = data.session?.user?.email?.toLowerCase();
        if (sessionEmail === allowedAdminEmail) {
            showAdminApp();
            await loadCollections();
        } else {
            showLogin();
        }
    })();
});
