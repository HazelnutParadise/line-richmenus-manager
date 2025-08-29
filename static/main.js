// LINE Rich Menu Manager - JavaScript
class RichMenuManager {
    constructor() {
        this.token = localStorage.getItem('line_token') || '';
        this.richMenus = [];
        this.selectedMenu = null;
        this.currentAreas = [];
        this.isDrawing = false;
        this.currentRect = null;
        this.userAction = null;

        // Canvas相關屬性
        this.originalImageWidth = 0;
        this.originalImageHeight = 0;
        this.canvasScale = 1;
        this.originalImageData = null;
        this.startX = 0;
        this.startY = 0;

        // 區域編輯相關屬性
        this.selectedAreaIndex = -1;
        this.isEditingMode = false;
        this.dragMode = 'none'; // 'none', 'move', 'resize'
        this.resizeHandle = ''; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
        this.dragStartX = 0;
        this.dragStartY = 0;

        // JSON匯入相關屬性
        this.selectedJsonFile = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showWelcomeScreen();

        if (this.token) {
            this.loadRichMenus();
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('newMenuBtn').addEventListener('click', () => this.showEditor());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadRichMenus());
        document.getElementById('searchBtn').addEventListener('click', () => this.toggleSearchBar());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('getStartedBtn').addEventListener('click', () => this.showSettings());

        // Search
        document.getElementById('userIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchUserRichMenu(e.target.value);
            }
        });

        // Menu actions
        document.getElementById('resetDefaultBtn').addEventListener('click', () => this.resetDefaultMenu());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteMenu());
        // Edit existing menu
        const editBtn = document.getElementById('editBtn');
        if (editBtn) editBtn.addEventListener('click', () => this.openEditorForSelected());
        document.getElementById('linkUserBtn').addEventListener('click', () => this.showUserModal('link'));
        document.getElementById('unlinkUserBtn').addEventListener('click', () => this.showUserModal('unlink'));
        document.getElementById('setDefaultBtn').addEventListener('click', () => this.setDefaultMenu());

        // Editor
        document.getElementById('imageUpload').addEventListener('change', (e) => this.loadImage(e));
        document.getElementById('jsonFileUpload').addEventListener('change', (e) => this.handleJsonFileSelect(e));
        document.getElementById('importJsonBtn').addEventListener('click', () => this.importFromJson());
        document.getElementById('actionType').addEventListener('change', (e) => this.toggleActionInputs(e.target.value));
        document.getElementById('addAreaBtn').addEventListener('click', () => this.addArea());
        document.getElementById('createMenuBtn').addEventListener('click', () => {
            // If editing an existing menu, perform update flow
            if (this.editingExisting && this.selectedMenu) {
                this.updateRichMenu();
            } else {
                this.createRichMenu();
            }
        });
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportToJson());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideEditor());

        // Canvas events
        const canvas = document.getElementById('editorCanvas');
        canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Bounds inputs
        ['boundsX', 'boundsY', 'boundsWidth', 'boundsHeight'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateRect());
            document.getElementById(id).addEventListener('change', () => this.updateRect());
        });

        // Modal events
        document.getElementById('saveTokenBtn').addEventListener('click', () => this.saveToken());
        document.getElementById('confirmUserActionBtn').addEventListener('click', () => this.performUserAction());

        // Close modal events
        document.querySelectorAll('.close, .close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal);
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        if (!this.token && !endpoint.includes('content')) {
            this.showAlert('錯誤', '請先設定 Channel Access Token');
            return null;
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            this.showLoading(true);
            const response = await fetch(endpoint, finalOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.blob();
            }
        } catch (error) {
            console.error('API Error:', error);
            this.showAlert('API 錯誤', error.message);
            return null;
        } finally {
            this.showLoading(false);
        }
    }

    // Rich Menu Operations
    async loadRichMenus() {
        const data = await this.apiCall('/richmenus');
        if (data && data.richmenus) {
            this.richMenus = data.richmenus;
            this.renderRichMenuList();
            this.hideWelcomeScreen();
        }
    }

    async deleteMenu() {
        if (!this.selectedMenu) return;

        if (confirm(`確定要刪除 "${this.selectedMenu.name}" 嗎？`)) {
            const result = await this.apiCall(`/richmenus/${this.selectedMenu.richMenuId}`, {
                method: 'DELETE'
            });

            if (result !== null) {
                this.showAlert('成功', 'Rich Menu 已刪除');
                this.loadRichMenus();
                this.hideMenuDetail();
            }
        }
    }

    async resetDefaultMenu() {
        if (confirm('確定要重設預設 Rich Menu 嗎？')) {
            const result = await this.apiCall('/user/all/richmenu', {
                method: 'DELETE'
            });

            if (result !== null) {
                this.showAlert('成功', '預設 Rich Menu 已重設');
            }
        }
    }

    async setDefaultMenu() {
        if (!this.selectedMenu) return;

        const result = await this.apiCall(`/user/all/richmenu/${this.selectedMenu.richMenuId}`, {
            method: 'POST'
        });

        if (result !== null) {
            this.showAlert('成功', 'Rich Menu 已設為預設');
        }
    }

    async searchUserRichMenu(userId) {
        if (!userId.trim()) return;

        const data = await this.apiCall(`/users/${userId}/richmenu`);
        if (data && data.richMenuId) {
            this.showAlert('用戶 Rich Menu', `用戶 ${userId} 的 Rich Menu ID: ${data.richMenuId}`);
        } else {
            this.showAlert('結果', `用戶 ${userId} 沒有設定 Rich Menu`);
        }
    }

    async performUserAction() {
        const userId = document.getElementById('modalUserId').value.trim();
        if (!userId) {
            this.showAlert('錯誤', '請輸入用戶 ID');
            return;
        }

        let endpoint, method;
        if (this.userAction === 'link') {
            endpoint = `/users/${userId}/richmenu/${this.selectedMenu.richMenuId}`;
            method = 'POST';
        } else if (this.userAction === 'unlink') {
            endpoint = `/users/${userId}/richmenu`;
            method = 'DELETE';
        }

        const result = await this.apiCall(endpoint, { method });
        if (result !== null) {
            const action = this.userAction === 'link' ? '連結' : '解除連結';
            this.showAlert('成功', `用戶 ${userId} ${action} 操作完成`);
            this.hideModal(document.getElementById('userModal'));
        }
    }

    // Rich Menu Creation
    async createRichMenu() {
        const name = document.getElementById('newMenuName').value.trim();
        const chatBarText = document.getElementById('newChatBarText').value.trim();
        const imageFile = document.getElementById('imageUpload').files[0];

        if (!name || !imageFile || this.currentAreas.length === 0) {
            this.showAlert('錯誤', '請填寫必要欄位並至少新增一個互動區域');
            return;
        }

        // Create rich menu structure
        const richMenuData = {
            size: {
                width: 2500,
                height: 1686 // or other supported sizes
            },
            selected: true,
            name: name,
            chatBarText: chatBarText || name,
            areas: this.currentAreas
        };

        // Create rich menu
        const createResult = await this.apiCall('/richmenus', {
            method: 'POST',
            body: JSON.stringify(richMenuData)
        });

        if (createResult && createResult.richMenuId) {
            // Upload image
            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResult = await this.apiCall(`/richmenus/${createResult.richMenuId}/content`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });

            if (uploadResult !== null) {
                this.showAlert('成功', 'Rich Menu 建立成功！');
                this.hideEditor();
                this.loadRichMenus();
            }
        }
    }

    // UI Methods
    renderRichMenuList() {
        const listContainer = document.getElementById('richMenuList');
        const countBadge = document.getElementById('menuCount');

        countBadge.textContent = `總計: ${this.richMenus.length} 個選單`;

        listContainer.innerHTML = this.richMenus.map(menu => `
            <div class="menu-item" data-id="${menu.richMenuId}">
                <h4>${menu.name}</h4>
                <img src="/richmenus/${menu.richMenuId}/content" 
                     alt="${menu.name}"
                     onerror="this.style.display='none'">
            </div>
        `).join('');

        // Add click events
        listContainer.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const menuId = item.dataset.id;
                this.selectMenu(menuId);
            });
        });
    }

    async selectMenu(menuId) {
        // Update selected state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-id="${menuId}"]`).classList.add('selected');

        // Load menu details
        const menuData = await this.apiCall(`/richmenus/${menuId}`);
        if (menuData) {
            this.selectedMenu = menuData;
            this.showMenuDetail(menuData);
        }
    }

    showMenuDetail(menu) {
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('menuEditor').classList.add('hidden');
        document.getElementById('menuDetail').classList.remove('hidden');

        // Fill form fields
        document.getElementById('menuId').value = menu.richMenuId;
        document.getElementById('menuName').value = menu.name;
        document.getElementById('chatBarText').value = menu.chatBarText || '';

        // Load image
        this.loadMenuImage(menu.richMenuId);

        // Show areas
        this.renderAreas(menu.areas);
    }

    hideMenuDetail() {
        document.getElementById('menuDetail').classList.add('hidden');
        this.selectedMenu = null;
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('selected');
        });
    } showEditor() {
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('menuDetail').classList.add('hidden');
        document.getElementById('menuEditor').classList.remove('hidden');

        // 重置表單
        this.resetEditor();
    }

    // Open editor pre-filled for the currently selected menu
    async openEditorForSelected() {
        if (!this.selectedMenu) return;
        await this.showEditorForExisting(this.selectedMenu);
    }

    // Populate editor with existing rich menu data for editing
    async showEditorForExisting(menu) {
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('menuDetail').classList.add('hidden');
        document.getElementById('menuEditor').classList.remove('hidden');

        // Reset editor then enable editingExisting flag
        this.resetEditor();
        this.editingExisting = true; // flag used when saving

        // Populate fields
        document.getElementById('newMenuName').value = menu.name || '';
        document.getElementById('newChatBarText').value = menu.chatBarText || '';

        // Load image into editor canvas by requesting the content endpoint
        // and drawing it to the canvas. We won't mark the imageUpload input.
        try {
            await this.loadExistingImage(menu.richMenuId);
        } catch (error) {
            console.error('載入現有圖片失敗:', error);
            this.showAlert('錯誤', '無法載入 Rich Menu 圖片，請重新上傳圖片');
            // Set default dimensions for the rich menu data
            this.originalImageWidth = menu.size?.width || 2500;
            this.originalImageHeight = menu.size?.height || 1686;
            // Still show the editor so user can upload a new image
            document.getElementById('areaEditor').classList.remove('hidden');
        }

        // Populate areas
        this.currentAreas = (menu.areas || []).map(a => ({
            bounds: { x: a.bounds.x, y: a.bounds.y, width: a.bounds.width, height: a.bounds.height },
            action: { ...a.action }
        }));

        this.updateCurrentAreasList();
        this.redrawCanvas();

        // Update create button text to indicate update
        document.getElementById('createMenuBtn').textContent = '更新 Rich Menu';
    }

    // Load existing image for editing
    async loadExistingImage(richMenuId) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.getElementById('editorCanvas');
                const ctx = canvas.getContext('2d');

                // scale similarly to loadImage
                const maxWidth = 800;
                const maxHeight = 600;
                let { width, height } = img;
                const scaleX = maxWidth / width;
                const scaleY = maxHeight / height;
                const scale = Math.min(scaleX, scaleY, 1);

                canvas.width = width * scale;
                canvas.height = height * scale;

                this.originalImageWidth = width;
                this.originalImageHeight = height;
                this.canvasScale = scale;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                canvas.parentElement.classList.add('has-image');
                document.getElementById('areaEditor').classList.remove('hidden');

                resolve();
            };
            img.onerror = () => {
                // Set default dimensions when image loading fails
                this.originalImageWidth = 2500;
                this.originalImageHeight = 1686;
                this.canvasScale = 1;
                console.error('圖片載入失敗，使用默認尺寸');
                reject(new Error('圖片載入失敗'));
            };
            img.src = `/richmenus/${richMenuId}/content`;
        });
    }

    // Update an existing rich menu: PUT metadata, optionally upload a new image
    async updateRichMenu() {
        if (!this.selectedMenu) return;

        const name = document.getElementById('newMenuName').value.trim();
        const chatBarText = document.getElementById('newChatBarText').value.trim();
        const imageFile = document.getElementById('imageUpload').files[0];

        if (!name || this.currentAreas.length === 0) {
            this.showAlert('錯誤', '請填寫必要欄位並至少有一個互動區域');
            return;
        }

        const richMenuData = {
            size: {
                width: this.originalImageWidth || 2500,
                height: this.originalImageHeight || 1686
            },
            selected: true,
            name: name,
            chatBarText: chatBarText || name,
            areas: this.currentAreas,
            deleteOld: true  // 自動刪除舊的rich menu
        };

        // Send PUT to update metadata; backend will create a new richmenu and return new id
        const endpoint = `/richmenus/${this.selectedMenu.richMenuId}`;
        const result = await this.apiCall(endpoint, {
            method: 'PUT',
            body: JSON.stringify(richMenuData)
        });

        if (result && result.richMenuId) {
            const newId = result.richMenuId;

            // Handle image upload/copy
            if (imageFile) {
                // User supplied a new image, upload it to the new rich menu
                const formData = new FormData();
                formData.append('image', imageFile);

                const uploadResult = await this.apiCall(`/richmenus/${newId}/content`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}` },
                    body: formData
                });

                if (uploadResult === null) {
                    // image upload failed
                    this.showAlert('警告', 'Metadata 已更新，但圖片上傳失敗');
                    return;
                }
            } else {
                // No new image supplied, copy the existing image from old rich menu
                try {
                    const imageResponse = await fetch(`/richmenus/${this.selectedMenu.richMenuId}/content`, {
                        headers: { 'Authorization': `Bearer ${this.token}` }
                    });

                    if (imageResponse.ok) {
                        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
                        const imageBlob = await imageResponse.blob();

                        const formData = new FormData();
                        // Use appropriate filename based on content type
                        const extension = contentType.includes('png') ? 'png' : 'jpg';
                        formData.append('image', imageBlob, `richmenu_image.${extension}`);

                        const uploadResult = await this.apiCall(`/richmenus/${newId}/content`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${this.token}` },
                            body: formData
                        });

                        if (uploadResult === null) {
                            this.showAlert('警告', 'Metadata 已更新，但圖片複製失敗');
                            return;
                        }
                    } else {
                        console.warn('無法獲取原始圖片:', imageResponse.status, imageResponse.statusText);
                        this.showAlert('警告', '無法獲取原始圖片，Metadata 已更新但無圖片');
                    }
                } catch (error) {
                    console.error('複製圖片時發生錯誤:', error);
                    this.showAlert('警告', 'Metadata 已更新，但圖片複製失敗');
                    return;
                }
            }

            this.showAlert('成功', 'Rich Menu 已更新');
            this.editingExisting = false;
            document.getElementById('createMenuBtn').textContent = '建立 Rich Menu';
            this.hideEditor();
            this.loadRichMenus();
        }
    }

    resetEditor() {
        // 重置表單欄位
        document.getElementById('newMenuName').value = '';
        document.getElementById('newChatBarText').value = '';
        document.getElementById('imageUpload').value = '';
        document.getElementById('jsonFileUpload').value = '';

        // 重置JSON匯入狀態
        this.selectedJsonFile = null;
        document.getElementById('importJsonBtn').disabled = true;

        // 重置Canvas
        const canvas = document.getElementById('editorCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 400;
        canvas.height = 300;

        // 重置Canvas容器樣式
        const canvasContainer = canvas.parentElement;
        canvasContainer.classList.remove('has-image');

        // 重置區域相關資料
        this.currentAreas = [];
        this.originalImageData = null;
        this.originalImageWidth = 0;
        this.originalImageHeight = 0;
        this.canvasScale = 1;

        this.updateCurrentAreasList();
        this.clearAreaForm();
        // reset editingExisting flag when creating a fresh editor
        this.editingExisting = false;
        // 只有在沒有圖片時才隱藏區域編輯器
        if (!this.originalImageData) {
            document.getElementById('areaEditor').classList.add('hidden');
        }
    }

    hideEditor() {
        document.getElementById('menuEditor').classList.add('hidden');
        if (this.richMenus.length === 0) {
            this.showWelcomeScreen();
        }
    }

    showWelcomeScreen() {
        document.getElementById('menuDetail').classList.add('hidden');
        document.getElementById('menuEditor').classList.add('hidden');
        document.getElementById('welcomeScreen').classList.remove('hidden');
    }

    hideWelcomeScreen() {
        document.getElementById('welcomeScreen').classList.add('hidden');
    }

    loadMenuImage(menuId) {
        const canvas = document.getElementById('previewCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // scale preview to reasonable size while keeping aspect ratio
            const maxWidth = 400;
            const maxHeight = 300;
            let { width, height } = img;
            const scaleX = maxWidth / width;
            const scaleY = maxHeight / height;
            const scale = Math.min(scaleX, scaleY, 1);

            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // draw area overlays if we have the selectedMenu loaded
            if (this.selectedMenu && Array.isArray(this.selectedMenu.areas)) {
                this.selectedMenu.areas.forEach(area => {
                    const a = area.bounds || {};
                    const x = (a.x || 0) * scale;
                    const y = (a.y || 0) * scale;
                    const w = (a.width || 0) * scale;
                    const h = (a.height || 0) * scale;

                    ctx.strokeStyle = '#06c755';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    ctx.strokeRect(x, y, w, h);
                    ctx.fillStyle = 'rgba(6, 199, 85, 0.08)';
                    ctx.fillRect(x, y, w, h);
                });
            }
        };

        img.onerror = () => {
            // clear canvas on error
            canvas.width = 0;
            canvas.height = 0;
        };

        img.src = `/richmenus/${menuId}/content`;
    }

    loadImage(event) {
        const file = event.target.files[0];
        if (!file) return;

        const canvas = document.getElementById('editorCanvas');
        const canvasContainer = canvas.parentElement;
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // 設定適當的Canvas尺寸，保持比例
            const maxWidth = 800;
            const maxHeight = 600;

            let { width, height } = img;

            // 計算縮放比例
            const scaleX = maxWidth / width;
            const scaleY = maxHeight / height;
            const scale = Math.min(scaleX, scaleY, 1); // 不放大，只縮小

            canvas.width = width * scale;
            canvas.height = height * scale;

            // 儲存原始圖片尺寸和縮放比例
            this.originalImageWidth = width;
            this.originalImageHeight = height;
            this.canvasScale = scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 儲存原始圖片數據用於重繪
            this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // 添加視覺反饋
            canvasContainer.classList.add('has-image');

            document.getElementById('areaEditor').classList.remove('hidden');

            // 顯示圖片資訊
            this.showAlert('圖片載入成功', `原始尺寸: ${width} x ${height}px\n顯示尺寸: ${canvas.width} x ${canvas.height}px\n縮放比例: ${(scale * 100).toFixed(1)}%`);
        };

        img.onerror = () => {
            this.showAlert('錯誤', '圖片載入失敗，請確認檔案格式正確');
        };

        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.readAsDataURL(file);
    }

    renderAreas(areas) {
        const container = document.getElementById('areasList');
        container.innerHTML = (areas || []).map((area, index) => `
            <div class="area-item">
                <div class="area-header">
                    <div class="area-index">${index + 1}</div>
                </div>
                <div class="area-details">
                    <div class="area-detail">
                        <strong>類型</strong>
                        <span>${area.action.type}</span>
                    </div>
                    <div class="area-detail">
                        <strong>標籤</strong>
                        <span>${area.action.label || '-'}</span>
                    </div>
                    ${area.action.text ? `
                        <div class="area-detail">
                            <strong>文字</strong>
                            <span>${area.action.text}</span>
                        </div>
                    ` : ''}
                    ${area.action.uri ? `
                        <div class="area-detail">
                            <strong>網址</strong>
                            <span>${area.action.uri}</span>
                        </div>
                    ` : ''}
                    ${area.action.data ? `
                        <div class="area-detail">
                            <strong>資料</strong>
                            <span>${area.action.data}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="area-actions-detail">
                    <button class="btn btn-sm btn-primary" onclick="richMenuManager.editAreaFromDetail(${index})" title="編輯">編輯</button>
                </div>
            </div>
        `).join('');
    }    // Canvas drawing and area management

    // Called from the detail view to edit a specific area
    async editAreaFromDetail(index) {
        if (!this.selectedMenu) return;
        // open editor prefilled for this menu
        await this.showEditorForExisting(this.selectedMenu);

        // select the area after a short delay to allow editor to populate
        setTimeout(() => {
            this.selectArea(index);
            document.getElementById('areaEditor').classList.remove('hidden');
            // scroll editor into view
            document.getElementById('areaEditor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
    }
    handleCanvasMouseDown(event) {
        const canvas = document.getElementById('editorCanvas');
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        // 檢查是否點擊了現有區域
        const clickedAreaIndex = this.getAreaAtPosition(x, y);

        if (clickedAreaIndex !== -1) {
            // 點擊了現有區域
            this.selectArea(clickedAreaIndex);

            // 檢查是否點擊了調整控制點
            const resizeHandle = this.getResizeHandle(x, y, clickedAreaIndex);
            if (resizeHandle) {
                this.dragMode = 'resize';
                this.resizeHandle = resizeHandle;
            } else {
                this.dragMode = 'move';
            }

            this.dragStartX = x;
            this.dragStartY = y;
            this.isEditingMode = true;
        } else {
            // 開始繪製新區域
            if (this.selectedAreaIndex !== -1) {
                this.deselectArea();
            }
            this.startDrawing(event);
        }
    }

    handleCanvasMouseMove(event) {
        const canvas = document.getElementById('editorCanvas');
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        if (this.isEditingMode && this.selectedAreaIndex !== -1) {
            // 拖拽或調整現有區域
            this.updateSelectedArea(x, y);
        } else if (this.isDrawing) {
            // 繪製新區域
            this.draw(event);
        } else {
            // 更新游標樣式
            this.updateCursor(x, y);
        }
    }

    handleCanvasMouseUp(event) {
        if (this.isEditingMode) {
            this.isEditingMode = false;
            this.dragMode = 'none';
            this.resizeHandle = '';
        } else {
            this.stopDrawing();
        }
    }

    handleCanvasClick(event) {
        // 處理單擊選擇區域的邏輯已經在mousedown中處理
    }

    getAreaAtPosition(x, y) {
        for (let i = this.currentAreas.length - 1; i >= 0; i--) {
            const area = this.currentAreas[i];
            const bounds = area.bounds;

            const canvasX = bounds.x * this.canvasScale;
            const canvasY = bounds.y * this.canvasScale;
            const canvasWidth = bounds.width * this.canvasScale;
            const canvasHeight = bounds.height * this.canvasScale;

            if (x >= canvasX && x <= canvasX + canvasWidth &&
                y >= canvasY && y <= canvasY + canvasHeight) {
                return i;
            }
        }
        return -1;
    }

    getResizeHandle(x, y, areaIndex) {
        const area = this.currentAreas[areaIndex];
        const bounds = area.bounds;

        const canvasX = bounds.x * this.canvasScale;
        const canvasY = bounds.y * this.canvasScale;
        const canvasWidth = bounds.width * this.canvasScale;
        const canvasHeight = bounds.height * this.canvasScale;

        const handleSize = 8;

        // 檢查調整控制點
        const handles = {
            'nw': { x: canvasX, y: canvasY },
            'ne': { x: canvasX + canvasWidth, y: canvasY },
            'sw': { x: canvasX, y: canvasY + canvasHeight },
            'se': { x: canvasX + canvasWidth, y: canvasY + canvasHeight },
            'n': { x: canvasX + canvasWidth / 2, y: canvasY },
            's': { x: canvasX + canvasWidth / 2, y: canvasY + canvasHeight },
            'w': { x: canvasX, y: canvasY + canvasHeight / 2 },
            'e': { x: canvasX + canvasWidth, y: canvasY + canvasHeight / 2 }
        };

        for (const [handle, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) <= handleSize && Math.abs(y - pos.y) <= handleSize) {
                return handle;
            }
        }

        return null;
    }

    updateCursor(x, y) {
        const canvas = document.getElementById('editorCanvas');
        const areaIndex = this.getAreaAtPosition(x, y);

        if (areaIndex !== -1) {
            const resizeHandle = this.getResizeHandle(x, y, areaIndex);
            if (resizeHandle) {
                // 設定調整游標
                const cursorMap = {
                    'nw': 'nw-resize', 'ne': 'ne-resize',
                    'sw': 'sw-resize', 'se': 'se-resize',
                    'n': 'n-resize', 's': 's-resize',
                    'w': 'w-resize', 'e': 'e-resize'
                };
                canvas.style.cursor = cursorMap[resizeHandle];
            } else {
                canvas.style.cursor = 'move';
            }
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }

    updateSelectedArea(currentX, currentY) {
        if (this.selectedAreaIndex === -1) return;

        const deltaX = (currentX - this.dragStartX) / this.canvasScale;
        const deltaY = (currentY - this.dragStartY) / this.canvasScale;

        const area = this.currentAreas[this.selectedAreaIndex];
        const bounds = area.bounds;

        if (this.dragMode === 'move') {
            // 移動區域
            bounds.x = Math.max(0, Math.min(bounds.x + deltaX, this.originalImageWidth - bounds.width));
            bounds.y = Math.max(0, Math.min(bounds.y + deltaY, this.originalImageHeight - bounds.height));
        } else if (this.dragMode === 'resize') {
            // 調整區域大小
            this.resizeArea(bounds, deltaX, deltaY);
        }

        // 更新輸入框
        this.updateAreaInputs(this.selectedAreaIndex);

        // 重繪Canvas
        this.redrawCanvas();

        this.dragStartX = currentX;
        this.dragStartY = currentY;
    }

    resizeArea(bounds, deltaX, deltaY) {
        const handle = this.resizeHandle;

        switch (handle) {
            case 'nw':
                bounds.x += deltaX;
                bounds.y += deltaY;
                bounds.width -= deltaX;
                bounds.height -= deltaY;
                break;
            case 'ne':
                bounds.y += deltaY;
                bounds.width += deltaX;
                bounds.height -= deltaY;
                break;
            case 'sw':
                bounds.x += deltaX;
                bounds.width -= deltaX;
                bounds.height += deltaY;
                break;
            case 'se':
                bounds.width += deltaX;
                bounds.height += deltaY;
                break;
            case 'n':
                bounds.y += deltaY;
                bounds.height -= deltaY;
                break;
            case 's':
                bounds.height += deltaY;
                break;
            case 'w':
                bounds.x += deltaX;
                bounds.width -= deltaX;
                break;
            case 'e':
                bounds.width += deltaX;
                break;
        }

        // 確保邊界合理
        bounds.x = Math.max(0, bounds.x);
        bounds.y = Math.max(0, bounds.y);
        bounds.width = Math.max(10, Math.min(bounds.width, this.originalImageWidth - bounds.x));
        bounds.height = Math.max(10, Math.min(bounds.height, this.originalImageHeight - bounds.y));
    }

    selectArea(index) {
        this.selectedAreaIndex = index;
        this.updateAreaInputs(index);
        this.updateCurrentAreasList();
        this.redrawCanvas();
    }

    deselectArea() {
        this.selectedAreaIndex = -1;
        this.clearAreaForm();
        this.updateCurrentAreasList();
        this.redrawCanvas();
        // 如果有圖片載入，保持區域編輯表單顯示
        if (this.originalImageData) {
            document.getElementById('areaEditor').classList.remove('hidden');
        }
    }

    updateAreaInputs(index) {
        if (index < 0 || index >= this.currentAreas.length) return;

        const area = this.currentAreas[index];

        document.getElementById('boundsX').value = Math.round(area.bounds.x);
        document.getElementById('boundsY').value = Math.round(area.bounds.y);
        document.getElementById('boundsWidth').value = Math.round(area.bounds.width);
        document.getElementById('boundsHeight').value = Math.round(area.bounds.height);

        document.getElementById('actionType').value = area.action.type;
        document.getElementById('actionLabel').value = area.action.label || '';

        this.toggleActionInputs(area.action.type);

        switch (area.action.type) {
            case 'message':
                document.getElementById('actionText').value = area.action.text || '';
                break;
            case 'uri':
                document.getElementById('actionUri').value = area.action.uri || '';
                break;
            case 'postback':
                document.getElementById('actionData').value = area.action.data || '';
                document.getElementById('actionDisplayText').value = area.action.displayText || '';
                break;
        }
    }

    updateRect() {
        // 如果正在編輯選中的區域，即時更新區域資料
        if (this.selectedAreaIndex >= 0 && this.isEditingMode) {
            const bounds = {
                x: parseInt(document.getElementById('boundsX').value) || 0,
                y: parseInt(document.getElementById('boundsY').value) || 0,
                width: parseInt(document.getElementById('boundsWidth').value) || 0,
                height: parseInt(document.getElementById('boundsHeight').value) || 0
            };

            // 驗證bounds在合法範圍內
            if (this.originalImageWidth > 0 && this.originalImageHeight > 0) {
                bounds.x = Math.max(0, Math.min(bounds.x, this.originalImageWidth - bounds.width));
                bounds.y = Math.max(0, Math.min(bounds.y, this.originalImageHeight - bounds.height));
                bounds.width = Math.max(1, Math.min(bounds.width, this.originalImageWidth - bounds.x));
                bounds.height = Math.max(1, Math.min(bounds.height, this.originalImageHeight - bounds.y));
            }

            // 更新當前區域的bounds
            if (this.currentAreas[this.selectedAreaIndex]) {
                this.currentAreas[this.selectedAreaIndex].bounds = bounds;
                // 更新區域列表顯示
                this.updateCurrentAreasList();
            }
        }

        this.redrawCanvas();
    }

    // 繪製新區域的方法
    startDrawing(event) {
        this.isDrawing = true;
        const canvas = document.getElementById('editorCanvas');
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        this.startX = x;
        this.startY = y;

        const originalX = Math.round(x / this.canvasScale);
        const originalY = Math.round(y / this.canvasScale);

        document.getElementById('boundsX').value = originalX;
        document.getElementById('boundsY').value = originalY;
        document.getElementById('boundsWidth').value = 0;
        document.getElementById('boundsHeight').value = 0;

        this.redrawCanvas();
    }

    draw(event) {
        if (!this.isDrawing) return;

        const canvas = document.getElementById('editorCanvas');
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        const width = Math.abs(x - this.startX);
        const height = Math.abs(y - this.startY);

        const minX = Math.min(x, this.startX);
        const minY = Math.min(y, this.startY);

        const originalX = Math.round(minX / this.canvasScale);
        const originalY = Math.round(minY / this.canvasScale);
        const originalWidth = Math.round(width / this.canvasScale);
        const originalHeight = Math.round(height / this.canvasScale);

        document.getElementById('boundsX').value = originalX;
        document.getElementById('boundsY').value = originalY;
        document.getElementById('boundsWidth').value = originalWidth;
        document.getElementById('boundsHeight').value = originalHeight;

        this.redrawCanvas();
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            // 顯示區域編輯表單
            document.getElementById('areaEditor').classList.remove('hidden');
            // 自動聚焦到標籤輸入框
            document.getElementById('actionLabel').focus();
        }
    }

    redrawCanvas() {
        const canvas = document.getElementById('editorCanvas');
        const ctx = canvas.getContext('2d');

        // 清除畫布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 重新繪製背景圖片
        if (this.originalImageData) {
            ctx.putImageData(this.originalImageData, 0, 0);
        }

        // 繪製所有已建立的區域
        this.currentAreas.forEach((area, index) => {
            this.drawArea(ctx, area, index === this.selectedAreaIndex);
        });

        // 只有在正在繪製時才繪製當前編輯中的區域
        if (this.isDrawing) {
            this.drawCurrentEditingArea(ctx);
        }
    }

    drawArea(ctx, area, isSelected = false) {
        const bounds = area.bounds;
        const x = bounds.x * this.canvasScale;
        const y = bounds.y * this.canvasScale;
        const width = bounds.width * this.canvasScale;
        const height = bounds.height * this.canvasScale;

        // 繪製區域邊框
        ctx.strokeStyle = isSelected ? '#ff4444' : '#06c755';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);

        // 繪製半透明填充
        ctx.fillStyle = isSelected ? 'rgba(255, 68, 68, 0.1)' : 'rgba(6, 199, 85, 0.1)';
        ctx.fillRect(x, y, width, height);

        // 繪製區域標籤
        this.drawAreaLabel(ctx, area, x, y, width, height, isSelected);

        // 如果是選中的區域，繪製調整控制點
        if (isSelected) {
            this.drawResizeHandles(ctx, x, y, width, height);
        }
    }

    drawAreaLabel(ctx, area, x, y, width, height, isSelected = false) {
        // 優先使用 label，如果沒有則使用 text，最後使用 type
        let label = area.action.label || area.action.text || area.action.type || '區域';

        // 如果是 message 類型且有 text，優先顯示 text
        if (area.action.type === 'message' && area.action.text) {
            label = area.action.text;
        }

        // 設定文字樣式
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 限制標籤長度避免過長
        if (label.length > 10) {
            label = label.substring(0, 8) + '...';
        }

        // 繪製文字背景
        const textWidth = ctx.measureText(label).width;
        const textHeight = 16;
        const textX = x + width / 2;
        const textY = y + height / 2;

        ctx.fillStyle = isSelected ? '#ff4444' : '#06c755';
        ctx.fillRect(textX - textWidth / 2 - 4, textY - textHeight / 2, textWidth + 8, textHeight);

        // 繪製文字
        ctx.fillStyle = 'white';
        ctx.fillText(label, textX, textY);
    }

    drawResizeHandles(ctx, x, y, width, height) {
        const handleSize = 6;
        const handles = [
            { x: x - handleSize / 2, y: y - handleSize / 2 }, // nw
            { x: x + width - handleSize / 2, y: y - handleSize / 2 }, // ne
            { x: x - handleSize / 2, y: y + height - handleSize / 2 }, // sw
            { x: x + width - handleSize / 2, y: y + height - handleSize / 2 }, // se
            { x: x + width / 2 - handleSize / 2, y: y - handleSize / 2 }, // n
            { x: x + width / 2 - handleSize / 2, y: y + height - handleSize / 2 }, // s
            { x: x - handleSize / 2, y: y + height / 2 - handleSize / 2 }, // w
            { x: x + width - handleSize / 2, y: y + height / 2 - handleSize / 2 } // e
        ];

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#06c755';
        ctx.lineWidth = 2;

        handles.forEach(handle => {
            ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
            ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        });
    }

    drawCurrentEditingArea(ctx) {
        if (!this.isDrawing) return;

        const x = parseInt(document.getElementById('boundsX').value) || 0;
        const y = parseInt(document.getElementById('boundsY').value) || 0;
        const width = parseInt(document.getElementById('boundsWidth').value) || 0;
        const height = parseInt(document.getElementById('boundsHeight').value) || 0;

        if (width === 0 || height === 0) return;

        const canvasX = x * this.canvasScale;
        const canvasY = y * this.canvasScale;
        const canvasWidth = width * this.canvasScale;
        const canvasHeight = height * this.canvasScale;

        // 繪製虛線邊框
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);

        // 繪製半透明填充
        ctx.fillStyle = 'rgba(255, 165, 0, 0.15)';
        ctx.fillRect(canvasX, canvasY, canvasWidth, canvasHeight);

        // 重置線條樣式
        ctx.setLineDash([]);
    }

    addArea() {
        const bounds = {
            x: parseInt(document.getElementById('boundsX').value) || 0,
            y: parseInt(document.getElementById('boundsY').value) || 0,
            width: parseInt(document.getElementById('boundsWidth').value) || 0,
            height: parseInt(document.getElementById('boundsHeight').value) || 0
        };

        const actionType = document.getElementById('actionType').value;
        const label = document.getElementById('actionLabel').value.trim();

        if (bounds.width === 0 || bounds.height === 0 || !label) {
            this.showAlert('錯誤', '請設定區域範圍和標籤');
            return;
        }

        const action = { type: actionType, label };

        switch (actionType) {
            case 'message':
                action.text = document.getElementById('actionText').value.trim();
                break;
            case 'uri':
                action.uri = document.getElementById('actionUri').value.trim();
                break;
            case 'postback':
                action.data = document.getElementById('actionData').value.trim();
                const displayText = document.getElementById('actionDisplayText').value.trim();
                if (displayText) action.displayText = displayText;
                break;
        }

        const area = { bounds, action };
        this.currentAreas.push(area);
        this.updateCurrentAreasList();
        this.clearAreaForm();

        // 重繪 Canvas 以顯示新添加的區域
        this.redrawCanvas();

        // 保持區域編輯表單顯示，不隱藏
        // document.getElementById('areaEditor').classList.add('hidden');
    }

    updateCurrentAreasList() {
        const container = document.getElementById('currentAreasList');
        container.innerHTML = this.currentAreas.map((area, index) => {
            // 智能獲取顯示標籤
            let displayLabel = area.action.label || area.action.text || area.action.type || '區域';
            if (area.action.type === 'message' && area.action.text) {
                displayLabel = area.action.text;
            }

            return `
            <div class="current-area ${index === this.selectedAreaIndex ? 'selected' : ''}" data-index="${index}">
                <div class="current-area-info" onclick="richMenuManager.selectAreaFromList(${index})">
                    <strong>${index + 1}.</strong> ${area.action.type} - ${displayLabel}
                    <div class="area-bounds">
                        座標: (${Math.round(area.bounds.x)}, ${Math.round(area.bounds.y)}) 
                        大小: ${Math.round(area.bounds.width)}×${Math.round(area.bounds.height)}
                    </div>
                </div>
                <div class="area-actions">
                    <button class="btn btn-sm btn-primary" onclick="richMenuManager.editArea(${index})" title="編輯">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="richMenuManager.removeArea(${index})" title="刪除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    removeArea(index) {
        this.currentAreas.splice(index, 1);
        // 如果刪除的是選中的區域，清除選取狀態
        if (this.selectedAreaIndex === index) {
            this.selectedAreaIndex = -1;
        } else if (this.selectedAreaIndex > index) {
            this.selectedAreaIndex--;
        }
        this.updateCurrentAreasList();
        this.redrawCanvas();
    }

    selectAreaFromList(index) {
        this.selectArea(index);
        // 顯示區域編輯表單
        document.getElementById('areaEditor').classList.remove('hidden');

        // 滾動到表單位置
        document.getElementById('areaEditor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    editArea(index) {
        this.selectAreaFromList(index);
        this.isEditingMode = true;

        // 更新按鈕文字
        const addBtn = document.getElementById('addAreaBtn');
        addBtn.textContent = '更新區域';
        addBtn.onclick = () => this.updateArea(index);

        // 新增取消編輯按鈕
        if (!document.querySelector('.cancel-edit-btn')) {
            const cancelEditBtn = document.createElement('button');
            cancelEditBtn.type = 'button';
            cancelEditBtn.className = 'btn btn-secondary cancel-edit-btn';
            cancelEditBtn.textContent = '取消編輯';
            cancelEditBtn.onclick = () => this.cancelEditArea();
            addBtn.parentNode.insertBefore(cancelEditBtn, addBtn.nextSibling);
        }
    }

    updateArea(index) {
        const bounds = {
            x: parseInt(document.getElementById('boundsX').value) || 0,
            y: parseInt(document.getElementById('boundsY').value) || 0,
            width: parseInt(document.getElementById('boundsWidth').value) || 0,
            height: parseInt(document.getElementById('boundsHeight').value) || 0
        };

        const actionType = document.getElementById('actionType').value;
        const label = document.getElementById('actionLabel').value.trim();

        if (bounds.width === 0 || bounds.height === 0 || !label) {
            this.showAlert('錯誤', '請設定區域範圍和標籤');
            return;
        }

        const action = { type: actionType, label };

        switch (actionType) {
            case 'message':
                action.text = document.getElementById('actionText').value.trim();
                break;
            case 'uri':
                action.uri = document.getElementById('actionUri').value.trim();
                break;
            case 'postback':
                action.data = document.getElementById('actionData').value.trim();
                const displayText = document.getElementById('actionDisplayText').value.trim();
                if (displayText) action.displayText = displayText;
                break;
        }

        // 更新區域資料
        this.currentAreas[index] = { bounds, action };

        // 更新顯示
        this.updateCurrentAreasList();
        this.redrawCanvas();

        // 重置編輯模式
        this.cancelEditArea();

        this.showAlert('成功', '區域已更新');
    }

    cancelEditArea() {
        this.isEditingMode = false;

        // 重置按鈕
        const addBtn = document.getElementById('addAreaBtn');
        addBtn.textContent = '新增區域';
        addBtn.onclick = () => this.addArea();

        // 移除取消編輯按鈕
        const cancelBtn = document.querySelector('.cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.remove();
        }

        // 清除選取但保持編輯表單顯示
        this.selectedAreaIndex = -1;
        this.clearAreaForm();
        this.updateCurrentAreasList();
        this.redrawCanvas();
    }

    handleKeyDown(e) {
        // 只在編輯器畫面且不在輸入框中時處理快速鍵
        if (document.getElementById('menuEditor').classList.contains('hidden')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                if (this.selectedAreaIndex >= 0) {
                    e.preventDefault();
                    this.removeArea(this.selectedAreaIndex);
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (this.isEditingMode) {
                    this.cancelEditArea();
                } else {
                    this.deselectArea();
                }
                break;
            case 'Enter':
                if (this.selectedAreaIndex >= 0 && !this.isEditingMode) {
                    e.preventDefault();
                    this.editArea(this.selectedAreaIndex);
                }
                break;
        }
    }

    clearAreaForm() {
        document.getElementById('boundsX').value = '';
        document.getElementById('boundsY').value = '';
        document.getElementById('boundsWidth').value = '';
        document.getElementById('boundsHeight').value = '';
        document.getElementById('actionLabel').value = '';
        document.getElementById('actionText').value = '';
        document.getElementById('actionUri').value = '';
        document.getElementById('actionData').value = '';
        document.getElementById('actionDisplayText').value = '';
        document.getElementById('actionType').value = 'message';
        this.toggleActionInputs('message');

        // 重繪 Canvas 以移除正在編輯的區域，但保留已建立的區域
        this.redrawCanvas();
    }

    toggleActionInputs(type) {
        document.getElementById('messageInputs').classList.toggle('hidden', type !== 'message');
        document.getElementById('uriInputs').classList.toggle('hidden', type !== 'uri');
        document.getElementById('postbackInputs').classList.toggle('hidden', type !== 'postback');
    }

    toggleSearchBar() {
        const searchBar = document.getElementById('searchBar');
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
            document.getElementById('userIdInput').focus();
        }
    }

    // Modal methods
    showSettings() {
        document.getElementById('tokenInput').value = this.token;
        this.showModal(document.getElementById('settingsModal'));
    }

    saveToken() {
        const token = document.getElementById('tokenInput').value.trim();
        if (token) {
            this.token = token;
            localStorage.setItem('line_token', token);
            this.hideModal(document.getElementById('settingsModal'));
            this.loadRichMenus();
        }
    }

    showUserModal(action) {
        if (!this.selectedMenu) return;
        this.userAction = action;
        document.getElementById('modalUserId').value = '';
        this.showModal(document.getElementById('userModal'));
    }

    showModal(modal) {
        modal.classList.add('show');
    }

    hideModal(modal) {
        modal.classList.remove('show');
    }

    showAlert(title, message) {
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').textContent = message;
        this.showModal(document.getElementById('alertModal'));
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
    }

    // JSON 匯入相關方法
    handleJsonFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.selectedJsonFile = file;
            // 自動觸發匯入按鈕
            document.getElementById('importJsonBtn').disabled = false;
        } else {
            this.selectedJsonFile = null;
            document.getElementById('importJsonBtn').disabled = true;
        }
    }

    async importFromJson() {
        if (!this.selectedJsonFile) {
            this.showAlert('錯誤', '請先選擇 JSON 文件');
            return;
        }

        try {
            const text = await this.readFileAsText(this.selectedJsonFile);
            const richMenuData = JSON.parse(text);

            // 驗證 JSON 結構
            if (!this.validateRichMenuJson(richMenuData)) {
                this.showAlert('錯誤', 'JSON 格式不正確，請確認是有效的 Rich Menu 配置文件');
                return;
            }

            // 填入表單資料
            this.populateFormFromJson(richMenuData);

            this.showAlert('成功', 'JSON 配置已成功匯入！請上傳對應的圖片文件。');

            // 清除文件選擇
            document.getElementById('jsonFileUpload').value = '';
            this.selectedJsonFile = null;
            document.getElementById('importJsonBtn').disabled = true;

        } catch (error) {
            console.error('JSON 匯入錯誤:', error);
            this.showAlert('錯誤', 'JSON 文件解析失敗：' + error.message);
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    validateRichMenuJson(data) {
        // 檢查必要欄位
        if (!data.name || typeof data.name !== 'string') return false;
        if (!data.size || typeof data.size !== 'object') return false;
        if (!data.size.width || !data.size.height) return false;
        if (!data.areas || !Array.isArray(data.areas)) return false;

        // 檢查區域結構
        for (const area of data.areas) {
            if (!area.bounds || typeof area.bounds !== 'object') return false;
            if (typeof area.bounds.x !== 'number' || typeof area.bounds.y !== 'number') return false;
            if (typeof area.bounds.width !== 'number' || typeof area.bounds.height !== 'number') return false;
            if (!area.action || typeof area.action !== 'object') return false;
            if (!area.action.type || typeof area.action.type !== 'string') return false;

            // 根據動作類型檢查必要屬性
            switch (area.action.type) {
                case 'message':
                    if (!area.action.text && !area.action.label) return false;
                    break;
                case 'uri':
                    if (!area.action.uri) return false;
                    break;
                case 'postback':
                    if (!area.action.data) return false;
                    break;
            }
        }

        return true;
    }

    populateFormFromJson(data) {
        // 填入基本資訊
        document.getElementById('newMenuName').value = data.name;
        document.getElementById('newChatBarText').value = data.chatBarText || '';

        // 清空現有區域
        this.currentAreas = [];

        // 匯入區域資料
        data.areas.forEach((area, index) => {
            const areaData = {
                bounds: {
                    x: area.bounds.x,
                    y: area.bounds.y,
                    width: area.bounds.width,
                    height: area.bounds.height
                },
                action: {
                    type: area.action.type,
                    // 智能處理 label：優先使用 label，沒有則使用 text，最後使用預設值
                    label: area.action.label || area.action.text || `區域 ${index + 1}`
                }
            };

            // 根據動作類型添加相應資料
            switch (area.action.type) {
                case 'message':
                    // 對於 message 類型，text 是必須的
                    areaData.action.text = area.action.text || area.action.label || `動作 ${index + 1}`;
                    break;
                case 'uri':
                    areaData.action.uri = area.action.uri || '';
                    // 如果沒有 label，使用 uri 作為顯示標籤
                    if (!area.action.label && area.action.uri) {
                        areaData.action.label = area.action.uri.substring(0, 10) + (area.action.uri.length > 10 ? '...' : '');
                    }
                    break;
                case 'postback':
                    areaData.action.data = area.action.data || '';
                    if (area.action.displayText) {
                        areaData.action.displayText = area.action.displayText;
                    }
                    // 如果沒有 label，使用 data 作為顯示標籤
                    if (!area.action.label && area.action.data) {
                        areaData.action.label = area.action.data.substring(0, 10) + (area.action.data.length > 10 ? '...' : '');
                    }
                    break;
            }

            this.currentAreas.push(areaData);
        });

        // 更新區域列表顯示
        this.updateCurrentAreasList();

        // 如果有區域，顯示編輯表單
        if (this.currentAreas.length > 0) {
            document.getElementById('areaEditor').classList.remove('hidden');
        }

        // 重繪 Canvas（如果有圖片的話）
        this.redrawCanvas();
    }

    // 導出當前配置為 JSON
    exportToJson() {
        if (this.currentAreas.length === 0) {
            this.showAlert('錯誤', '請先建立至少一個互動區域');
            return;
        }

        const menuName = document.getElementById('newMenuName').value.trim();
        const chatBarText = document.getElementById('newChatBarText').value.trim();

        if (!menuName) {
            this.showAlert('錯誤', '請輸入 Rich Menu 名稱');
            return;
        }

        const richMenuData = {
            name: menuName,
            chatBarText: chatBarText,
            size: {
                width: this.originalImageWidth || 2500,
                height: this.originalImageHeight || 1686
            },
            selected: false,
            areas: this.currentAreas.map(area => ({
                bounds: {
                    x: Math.round(area.bounds.x),
                    y: Math.round(area.bounds.y),
                    width: Math.round(area.bounds.width),
                    height: Math.round(area.bounds.height)
                },
                action: { ...area.action }
            }))
        };

        // 下載 JSON 文件
        const blob = new Blob([JSON.stringify(richMenuData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${menuName.replace(/[^a-zA-Z0-9]/g, '_')}_richmenu.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the application
const richMenuManager = new RichMenuManager();
