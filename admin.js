document.addEventListener('DOMContentLoaded', () => {

    
    // --- Elements ---
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const adminApp = document.getElementById('adminApp');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const toggleSidebar = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    
    const newCollectionBtn = document.getElementById('newCollectionBtn');
    const backToCollections = document.getElementById('backToCollections');
    const collectionsView = document.getElementById('collectionsView');
    const editCollectionView = document.getElementById('editCollectionView');
    
    const addVariationBtn = document.getElementById('addVariationBtn');
    const variationsContainer = document.getElementById('variationsContainer');
    const collectionForm = document.getElementById('collectionForm');
    const collectionsGrid = document.getElementById('collectionsGrid');

    // --- State ---
    let collections = [];

    // --- Login Logic ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        // Mock simple login validation
        if (user === 'admin' && pass === 'admin4030') {
            loginModal.style.display = 'none';
            adminApp.style.display = 'flex';
        } else {
            loginError.textContent = 'Usuário ou senha incorretos.';
        }
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        adminApp.style.display = 'none';
        loginModal.style.display = 'flex';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        loginError.textContent = '';
    });

    // --- Sidebar Logic ---
    toggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // --- Navigation Logic ---
    function showView(viewId) {
        document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
        document.getElementById(viewId).style.display = 'block';
    }

    newCollectionBtn.addEventListener('click', () => {
        document.getElementById('editViewTitle').textContent = 'Nova Coleção';
        collectionForm.reset();
        variationsContainer.innerHTML = '';
        document.getElementById('coverPreview').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Clique para selecionar a capa</p>';
        showView('editCollectionView');
    });

    backToCollections.addEventListener('click', () => {
        showView('collectionsView');
    });

    // --- Form Logic ---
    // Cover Image Preview
    let coverFile = null;
    document.getElementById('colCover').addEventListener('change', function(e) {
        coverFile = e.target.files[0];
        if (coverFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('coverPreview').innerHTML = `<img src="${e.target.result}" style="max-width:100%; max-height:200px; border-radius:8px;" />`;
            }
            reader.readAsDataURL(coverFile);
        }
    });

    // Add Variation
    let varCount = 0;
    addVariationBtn.addEventListener('click', () => {
        varCount++;
        const div = document.createElement('div');
        div.className = 'variation-item';
        div.innerHTML = `
            <div class="variation-img-upload">
                <input type="file" class="file-input var-file" accept="image/*" required>
                <div class="upload-placeholder var-preview">
                    <i class="fas fa-camera"></i>
                </div>
            </div>
            <div class="variation-details">
                <div class="form-group full-width">
                    <label>Descrição</label>
                    <input type="text" class="var-desc" placeholder="Ex: Top M, Calcinha P - Rosa" required>
                </div>
                <div class="form-group">
                    <label>Valor à vista (com desconto)</label>
                    <input type="text" class="var-vista" placeholder="R$ 0,00" required>
                </div>
                <div class="form-group">
                    <label>Valor Parcelado</label>
                    <input type="text" class="var-parcelado" placeholder="R$ 0,00" required>
                </div>
            </div>
            <button type="button" class="remove-variation"><i class="fas fa-trash"></i></button>
        `;
        
        // Setup image preview for variation
        const fileInput = div.querySelector('.var-file');
        const preview = div.querySelector('.var-preview');
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; display:block;" />`;
                }
                reader.readAsDataURL(file);
            }
        });

        // Setup remove button
        div.querySelector('.remove-variation').addEventListener('click', () => {
            div.remove();
        });

        variationsContainer.appendChild(div);
    });

    // Upload Helper
    async function uploadImage(file, pathFolder) {
        if (!file) return null;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${pathFolder}/${fileName}`;
        
        const { data, error } = await supabase.storage.from('produtos').upload(filePath, file);
        if (error) {
            console.error("Erro upload:", error);
            throw error;
        }
        
        const { data: publicData } = supabase.storage.from('produtos').getPublicUrl(filePath);
        return publicData.publicUrl;
    }

    // Save Collection
    collectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = collectionForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;

        try {
            const name = document.getElementById('colName').value;
            
            // Upload Cover
            let coverUrl = '';
            if (coverFile) {
                coverUrl = await uploadImage(coverFile, 'capas');
            }

            // Insert Collection
            const { data: colData, error: colError } = await supabase
                .from('colecoes')
                .insert([{ nome: name, capa_url: coverUrl }])
                .select();
                
            if (colError) throw colError;
            
            const collectionId = colData[0].id;

            // Upload Variations and Insert
            const variationItems = document.querySelectorAll('.variation-item');
            for (let item of variationItems) {
                const fileInput = item.querySelector('.var-file');
                const desc = item.querySelector('.var-desc').value;
                const vista = item.querySelector('.var-vista').value;
                const parcelado = item.querySelector('.var-parcelado').value;
                
                let varImgUrl = '';
                if (fileInput.files[0]) {
                    varImgUrl = await uploadImage(fileInput.files[0], 'variacoes');
                }

                await supabase.from('variacoes').insert([{
                    colecao_id: collectionId,
                    imagem_url: varImgUrl,
                    descricao: desc,
                    valor_vista: vista,
                    valor_parcelado: parcelado
                }]);
            }

            alert("Coleção criada com sucesso!");
            loadCollections();
            showView('collectionsView');
            
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar coleção. Verifique o console.");
        } finally {
            submitBtn.innerHTML = 'Salvar Coleção';
            submitBtn.disabled = false;
        }
    });

    async function loadCollections() {
        if (!supabase) return;
        collectionsGrid.innerHTML = '<p>Carregando coleções...</p>';
        
        const { data, error } = await supabase
            .from('colecoes')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error(error);
            return;
        }

        collectionsGrid.innerHTML = '';
        if (data.length === 0) {
            collectionsGrid.innerHTML = '<p>Nenhuma coleção criada ainda.</p>';
            return;
        }

        data.forEach(col => {
            const card = document.createElement('div');
            card.className = 'collection-card';
            card.innerHTML = `
                <div class="card-img" style="background-image: url('${col.capa_url}');"></div>
                <div class="card-info">
                    <h4>${col.nome}</h4>
                    <div class="card-actions">
                        <button class="btn-secondary btn-sm" style="color: var(--error-color);" onclick="deleteCollection('${col.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            collectionsGrid.appendChild(card);
        });
    }

    // Expose delete to window so inline onclick works
    window.deleteCollection = async (id) => {
        if (confirm("Tem certeza que deseja excluir esta coleção?")) {
            await supabase.from('colecoes').delete().eq('id', id);
            loadCollections();
        }
    };

    // Load initially if logged in
    // For now we just load when viewing dashboard
    if (supabase) {
        loadCollections();
    }

});
