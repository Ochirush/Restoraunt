class Auth {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('user')) || null;
        this.init();
    }

    init() {
        if (this.currentUser) {
            this.showMainContent();
            this.updateNavigation();
        }
    }

    async login(email, password) {
        try {
            utils.showLoading();
            const data = await api.login(email, password);
            api.setToken(data.token);
            this.currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            this.showMainContent();
            this.updateNavigation();
            utils.showToast('Успешный вход!', 'success');
        } catch (error) {
            utils.showToast(error.message || 'Ошибка входа', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async register(userData) {
        try {
            utils.showLoading();
            await api.register(userData);
            utils.showToast('Регистрация успешна! Войдите в систему.', 'success');
            this.showLogin();
        } catch (error) {
            utils.showToast(error.message || 'Ошибка регистрации', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    logout() {
        api.clearToken();
        localStorage.removeItem('user');
        this.currentUser = null;
        this.showAuth();
        utils.showToast('Вы вышли из системы', 'success');
    }

    showAuth() {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        this.showLogin();
    }

    showMainContent() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        this.updateUserInfo();
        dashboard.loadDashboardData();
    }

    showLogin() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    }

    showRegister() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('regFullName').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
    }

    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userRole').textContent = this.currentUser.role;
            document.getElementById('welcomeName').textContent = this.currentUser.name;
        }
    }

    updateNavigation() {
        const inventoryLink = document.getElementById('inventoryLink');
        const reportsLink = document.getElementById('reportsLink');
        const menuLink = document.getElementById('menuLink');
        
        const allowedRolesForInventory = ['manager', 'chef', 'head_chef'];
        const allowedRolesForReports = ['manager', 'analyst'];
        const allowedRolesForMenu = ['manager', 'chef', 'head_chef'];
        
        inventoryLink.style.display = allowedRolesForInventory.includes(this.currentUser?.role) ? 'flex' : 'none';
        reportsLink.style.display = allowedRolesForReports.includes(this.currentUser?.role) ? 'flex' : 'none';
        menuLink.style.display = allowedRolesForMenu.includes(this.currentUser?.role) ? 'flex' : 'none';
    }

    toggleMenu() {
        const navLinks = document.getElementById('navLinks');
        navLinks.classList.toggle('active');
    }
}

const auth = new Auth();
window.auth = auth;