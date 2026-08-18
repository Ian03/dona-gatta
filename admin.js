document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const adminApp = document.getElementById('adminApp');
    const loginError = document.getElementById('loginError');
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
    const colCover = document.getElementById('colCover');
    const coverPreview = document.getElementById('coverPreview');
    const editViewTitle = document.getElementById('editViewTitle');
    const defaultCollectionEyebrow = 'Coleção Verão';
    const defaultCollectionIntro = 'Escolha a sua variação favorita e consulte a disponibilidade com a nossa equipe.';

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

    function showView(viewId) {
        document.querySelectorAll('.view-section').forEach(section => section.style.display = 'none');
        document.getElementById(viewId).style.display = 'block';
    }

    function resetEditor() {
        editingCollection = null;
        coverFile = null;
        removedVariationIds = new Set();
        collectionForm.reset();
        colEyebrow.value = defaultCollectionEyebrow;
        colIntroText.value = defaultCollectionIntro;
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
            if (file) showImagePreview(preview, URL.createObjectURL(file));
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
            let capaUrl = editingCollection?.capa_url || '';
            if (coverFile) capaUrl = await uploadImage(coverFile, 'capas');

            let collectionId = editingCollection?.id;
            if (collectionId) {
                const { error } = await supabaseClient
                    .from('colecoes')
                    .update({ nome, capa_url: capaUrl, catalogo_eyebrow, catalogo_intro })
                    .eq('id', collectionId);
                if (error) throw error;
            } else {
                const { data, error } = await supabaseClient
                    .from('colecoes')
                    .insert([{ nome, capa_url: capaUrl, catalogo_eyebrow, catalogo_intro }])
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

        collectionsGrid.replaceChildren();
        if (!data?.length) {
            collectionsGrid.textContent = 'Nenhuma coleção criada ainda.';
            return;
        }

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

    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        const user = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (user === 'admin' && password === 'admin4030') {
            loginModal.style.display = 'none';
            adminApp.style.display = 'flex';
            loadCollections();
        } else {
            loginError.textContent = 'Usuário ou senha incorretos.';
        }
    });
    logoutBtn.addEventListener('click', event => {
        event.preventDefault();
        adminApp.style.display = 'none';
        loginModal.style.display = 'flex';
        loginForm.reset();
        loginError.textContent = '';
        resetEditor();
    });
    toggleSidebar.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    document.querySelectorAll('.sidebar-nav a[data-target]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const target = link.dataset.target;
            document.querySelectorAll('.sidebar-nav li').forEach(item => item.classList.remove('active'));
            link.closest('li').classList.add('active');
            document.getElementById('pageTitle').textContent = target === 'dashboard'
                ? 'Visão geral das coleções'
                : 'Gerenciador de Coleções';
            showView('collectionsView');
            loadCollections();
        });
    });
    newCollectionBtn.addEventListener('click', openNewCollection);
    backToCollections.addEventListener('click', () => showView('collectionsView'));
    addVariationBtn.addEventListener('click', () => createVariationItem());
    colCover.addEventListener('change', () => {
        coverFile = colCover.files[0] || null;
        if (coverFile) showImagePreview(coverPreview, URL.createObjectURL(coverFile), 'cover-image');
    });
        collectionForm.addEventListener('submit', saveCollection);
});
