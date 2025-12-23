const API_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }
    async getIngredientById(id) {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'GET',
        headers: this.getHeaders()
    });
    return this.handleResponse(response);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    async handleResponse(response) {
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Ошибка сервера');
        }
    }

    // Auth API
    async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ email, password })
        });
        return this.handleResponse(response);
    }

    async register(userData) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(userData)
        });
        return this.handleResponse(response);
    }

    async getProfile() {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    // Orders API
    async getOrders(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/orders?${queryParams}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getOrderById(id) {
        const response = await fetch(`${API_URL}/orders/${id}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async createOrder(orderData) {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(orderData)
        });
        return this.handleResponse(response);
    }

    async updateOrder(id, orderData) {
        const response = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(orderData)
        });
        return this.handleResponse(response);
    }

    async updatePositionStatus(orderId, positionId, isReady) {
        const response = await fetch(`${API_URL}/orders/${orderId}/positions/${positionId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ is_ready: isReady })
        });
        return this.handleResponse(response);
    }

    // Inventory API
    async getInventory(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/inventory?${queryParams}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getLowStockIngredients() {
        const response = await fetch(`${API_URL}/inventory/low-stock`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getExpiringSoon() {
        const response = await fetch(`${API_URL}/inventory/expiring-soon`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getSuppliers() {
        const response = await fetch(`${API_URL}/inventory/suppliers`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async addIngredient(ingredientData) {
        const response = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(ingredientData)
        });
        return this.handleResponse(response);
    }

    async updateIngredient(id, ingredientData) {
        const response = await fetch(`${API_URL}/inventory/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(ingredientData)
        });
        return this.handleResponse(response);
    }

    // Menu API
    async getMenu(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/menu?${queryParams}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getCategories() {
        const response = await fetch(`${API_URL}/menu/categories`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getDishById(id) {
        const response = await fetch(`${API_URL}/menu/${id}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    // Reports API
    async getSalesReport(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/reports/sales?${queryParams}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getInventoryReport() {
        const response = await fetch(`${API_URL}/reports/inventory`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getEmployeePerformance() {
        const response = await fetch(`${API_URL}/reports/employee-performance`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getPopularDishes(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/reports/popular-dishes?${queryParams}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getDailyStats() {
        const response = await fetch(`${API_URL}/reports/daily-stats`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
}

const api = new ApiService();
window.api = api;