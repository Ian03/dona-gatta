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
    const maxImageSizeBytes = 30 * 1024 * 1024;
    const maxUploadDimension = 1500;
    const webpQuality = 0.8;
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
            alert(`${fieldLabel}: o arquivo excede o limite de ${Math.round(maxImageSizeBytes / (1024 * 1024))} MB.`);
            return false;
        }

        return true;
    }

    async function compressImage(file) {
        if (!file) return file;
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            const scale = Math.min(1, maxUploadDimension / Math.max(bitmap.width, bitmap.height));
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            context.drawImage(bitmap, 0, 0, width, height);
            bitmap.close?.();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', webpQuality));
            if (!blob || blob.size >= file.size) return file;
            const name = `${file.name.replace(/\.[^.]+$/, '')}.webp`;
            return new File([blob], name, { type: 'image/webp' });
        } catch (error) {
            console.warn('Não foi possível comprimir a imagem, o arquivo original será enviado.', error);
            return file;
        }
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
        const compressed = await compressImage(file);
        const extension = compressed.name.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}_${crypto.randomUUID()}.${extension}`;
        const filePath = `${pathFolder}/${fileName}`;
        const { error } = await supabaseClient.storage.from('produtos').upload(filePath, compressed);
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
        placeholder.textContent = 'Selecione um grupo';
        pdfCollectionSelect.append(placeholder);

        collectionsGrid.replaceChildren();
        if (!data?.length) {
            collectionsGrid.textContent = 'Nenhuma coleção criada ainda.';
            return;
        }

        const groupNames = [...new Set(
            (data || [])
                .map(collection => (collection.catalogo_eyebrow || defaultCollectionEyebrow).trim() || defaultCollectionEyebrow)
        )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

        groupNames.forEach(groupName => {
            const option = document.createElement('option');
            option.value = groupName;
            option.textContent = groupName;
            pdfCollectionSelect.append(option);
        });

        data.forEach(collection => {
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
        :root{--wine:#401010;--wine-deep:#2c0a0a;--cream:#fbf4ee;--text:#3d2020;--line:#e8d7c8;--gold:#b9853d;--pix:#f7eee5;--paper:#fffdf9}
        *{box-sizing:border-box}
        body{margin:0;font-family:Arial,sans-serif;background:linear-gradient(180deg,#f7ede4 0%,#fbf4ee 100%);color:var(--text)}
        .pdf-shell{padding:26px}
        .pdf-cover-panel{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--wine) 0%,#5b1a1a 50%,var(--wine-deep) 100%);color:#fff7f0;border-radius:28px;padding:34px 34px 30px;margin-bottom:24px;min-height:320px}
        .pdf-cover-panel:before{content:"";position:absolute;inset:auto -50px -90px auto;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.14),transparent 68%)}
        .pdf-cover-panel:after{content:"";position:absolute;inset:20px auto auto 20px;width:120px;height:120px;border-radius:24px;border:1px solid rgba(255,255,255,.12);opacity:.45}
        .pdf-header{display:grid;grid-template-columns:1.05fr .95fr;gap:28px;align-items:center;position:relative;z-index:1}
        .pdf-header-copy{padding:8px 0}
        .pdf-eyebrow{font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:#dfc3a5}
        .pdf-title{font-family:Georgia,serif;font-size:52px;line-height:.88;margin:16px 0 14px;color:#fffdf9}
        .pdf-intro{font-size:16px;line-height:1.7;max-width:520px;color:#f5ddd0}
        .pdf-cover-meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
        .pdf-badge{display:inline-flex;align-items:center;justify-content:center;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#fce9d7}
        .pdf-cover-card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);padding:14px;border-radius:22px;backdrop-filter:blur(4px)}
        .pdf-cover img{width:100%;height:290px;object-fit:cover;border-radius:18px;display:block}
        .pdf-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px;padding:0 4px}
        .pdf-section-title{font-family:Georgia,serif;font-size:26px;color:var(--wine);letter-spacing:.04em}
        .pdf-section-subtitle{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8c6a54}
        .pdf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
        .pdf-card{background:var(--paper);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 10px 24px rgba(64,16,16,.06);page-break-inside:avoid}
        .pdf-image-wrap{aspect-ratio:4/5;background:#efe3d7;overflow:hidden}
        .pdf-image-wrap img{width:100%;height:100%;object-fit:cover}
        .pdf-image-fallback{display:grid;place-items:center;height:100%;color:#7a5740}
        .pdf-card-body{padding:18px}
        .pdf-model-name{font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:var(--wine)}
        .pdf-variation-name{margin-top:7px;color:#7a5740;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
        .pdf-price-box{display:grid;gap:4px;padding:11px 12px;border-radius:14px;margin-top:12px;border:1px solid var(--line)}
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
        .pdf-footer{margin-top:24px;padding:16px 4px 0;border-top:1px solid var(--line);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7a5740;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
        @page{size:A4;margin:14mm}
        @media print {.pdf-shell{padding:0}.pdf-cover-panel{margin-bottom:18px;border-radius:0;min-height:auto}.pdf-cover img{height:250px}.pdf-grid{gap:14px}.pdf-card{box-shadow:none}}
    </style>
</head>
<body>
    <div class="pdf-shell">
        <section class="pdf-cover-panel">
            <div class="pdf-header">
                <div class="pdf-header-copy">
                    <div class="pdf-eyebrow">Grupo da coleção</div>
                    <h1 class="pdf-title">${groupName}</h1>
                    <p class="pdf-intro">${groupIntro}</p>
                    <div class="pdf-cover-meta">
                        <span class="pdf-badge">${groupedCollections.length} modelos</span>
                        <span class="pdf-badge">Catálogo para WhatsApp</span>
                    </div>
                </div>
                <div class="pdf-cover-card">
                    <div class="pdf-cover">
                        ${selectedCollection.capa_url ? `<img src="${selectedCollection.capa_url}" alt="${groupName}">` : ''}
                    </div>
                </div>
            </div>
        </section>
        <div class="pdf-section-head">
            <div class="pdf-section-title">Modelos do grupo</div>
            <div class="pdf-section-subtitle">Dona Gatta</div>
        </div>
        <section class="pdf-grid">${cards}</section>
        <footer class="pdf-footer">
            <span>Dona Gatta · Catálogo de coleção</span>
                    <span>Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
        </footer>
    </div>
</body>
</html>`;
    }

    async function exportCollectionToPdf() {
        const groupName = pdfCollectionSelect.value.trim();
        if (!groupName) {
            alert('Selecione um grupo para exportar.');
            return;
        }

        exportPdfBtn.disabled = true;
        const originalHtml = exportPdfBtn.innerHTML;
        exportPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando PDF...';

        try {
            const { data: groupedCollections, error: groupedError } = await supabaseClient
                .from('colecoes')
                .select('*, variacoes(*)')
                .eq('catalogo_eyebrow', groupName)
                .order('created_at', { ascending: false });

            if (groupedError || !groupedCollections?.length) {
                throw groupedError || new Error('Não foi possível carregar o grupo da coleção para exportação.');
            }

            const collection = groupedCollections[0];
            const existingFrame = document.getElementById('pdfExportFrame');
            if (existingFrame) existingFrame.remove();

            const printFrame = document.createElement('iframe');
            printFrame.id = 'pdfExportFrame';
            printFrame.setAttribute('aria-hidden', 'true');
            printFrame.style.position = 'fixed';
            printFrame.style.left = '-10000px';
            printFrame.style.top = '0';
            printFrame.style.width = '794px';
            printFrame.style.height = '1123px';
            printFrame.style.opacity = '0';
            printFrame.style.pointerEvents = 'none';
            printFrame.style.border = '0';
            document.body.append(printFrame);

            const frameDocument = printFrame.contentWindow?.document;
            if (!frameDocument || !printFrame.contentWindow) {
                throw new Error('Não foi possível preparar a exportação em PDF.');
            }

            frameDocument.open();
            frameDocument.write(buildPdfMarkup(collection, groupedCollections));
            frameDocument.close();

            const waitForFrameReady = () => new Promise(resolve => {
                const attemptReady = () => {
                    const frameWindow = printFrame.contentWindow;
                    const frameDoc = frameWindow?.document;
                    if (!frameWindow || !frameDoc) {
                        window.setTimeout(attemptReady, 120);
                        return;
                    }

                    const images = [...frameDoc.images];
                    const pending = images.filter(image => !image.complete);

                    if (!pending.length && frameDoc.readyState === 'complete') {
                        resolve();
                        return;
                    }

                    let remaining = pending.length;
                    const finalize = () => {
                        remaining -= 1;
                        if (remaining <= 0) {
                            window.setTimeout(resolve, 250);
                        }
                    };

                    if (!pending.length) {
                        window.setTimeout(resolve, 250);
                        return;
                    }

                    pending.forEach(image => {
                        image.addEventListener('load', finalize, { once: true });
                        image.addEventListener('error', finalize, { once: true });
                    });

                    window.setTimeout(resolve, 1800);
                };

                attemptReady();
            });

            await waitForFrameReady();
            await new Promise(resolve => window.setTimeout(resolve, 300));

            if (!printFrame.contentWindow) {
                throw new Error('Não foi possível finalizar a exportação em PDF.');
            }

            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            window.setTimeout(() => printFrame.remove(), 2000);
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
