class Menu {
    constructor() {
        this.currentFilters = {};
        this.categories = [];
    }

    async init() {
        await this.loadCategories();
    }

    async loadCategories() {
        try {
            this.categories = await api.getCategories();
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    }

    populateCategoryFilter() {
        const filter = document.getElementById('menuCategoryFilter');
        if (!filter) return;

        filter.innerHTML = '<option value="">Все категории</option>';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filter.appendChild(option);
        });
    }

    async loadMenu() {
        try {
            utils.showLoading();
            const dishes = await api.getMenu(this.currentFilters);
            this.renderMenu(dishes);
        } catch (error) {
            console.error('Ошибка загрузки меню:', error);
            utils.showToast('Ошибка загрузки меню', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderMenu(dishes) {
        const container = document.getElementById('menuContainer');
        if (!container) return;

        if (!dishes || dishes.length === 0) {
            container.innerHTML = '<p style="text-align: center;">Блюда не найдены</p>';
            return;
        }

        let html = '<div class="menu-grid">';
        dishes.forEach(dish => {
            html += `
                <div class="menu-card">
                    <div class="menu-card-header">
                        <h3>${dish.dish_name}</h3>
                        <span class="price">${utils.formatCurrency(dish.price)}</span>
                    </div>
                    <div class="menu-card-body">
                        <p><strong>Категория:</strong> ${dish.category}</p>
                        <p><strong>Время приготовления:</strong> ${dish.cooking_time}</p>
                        <p><strong>Доступность:</strong> 
                            <span class="status-badge ${dish.availability ? 'status-доступно' : 'status-недоступно'}">
                                ${dish.availability ? 'Доступно' : 'Недоступно'}
                            </span>
                        </p>
                    </div>
                    <div class="menu-card-actions">
                        <button class="btn-small" onclick="menu.viewDish(${dish.dish_id})">Подробнее</button>
                        ${auth.currentUser.role === 'manager' || auth.currentUser.role === 'chef' || auth.currentUser.role === 'head_chef' ? 
                            `<button class="btn-small btn-warning" onclick="menu.editDish(${dish.dish_id})">Изменить</button>` : ''}
                        ${auth.currentUser.role === 'manager' ? 
                            `<button class="btn-small btn-danger" onclick="menu.deleteDish(${dish.dish_id})">Удалить</button>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async viewDish(dishId) {
        try {
            utils.showLoading();
            const dish = await api.getDishById(dishId);
            
            let ingredientsHtml = '';
            if (dish.ingredients && dish.ingredients.length > 0) {
                ingredientsHtml = '<h4>Ингредиенты:</h4><ul>';
                dish.ingredients.forEach(ing => {
                    if (ing.ingredient_name) {
                        ingredientsHtml += `<li>${ing.ingredient_name} - ${ing.required_quantity} ${ing.unit}</li>`;
                    }
                });
                ingredientsHtml += '</ul>';
            }

            const content = `
                <div class="dish-details">
                    <h3>${dish.dish_name}</h3>
                    <p><strong>Цена:</strong> ${utils.formatCurrency(dish.price)}</p>
                    <p><strong>Категория:</strong> ${dish.category}</p>
                    <p><strong>Время приготовления:</strong> ${dish.cooking_time}</p>
                    <p><strong>Доступность:</strong> 
                        <span class="status-badge ${dish.availability ? 'status-доступно' : 'status-недоступно'}">
                            ${dish.availability ? 'Доступно' : 'Недоступно'}
                        </span>
                    </p>
                    ${ingredientsHtml}
                </div>
            `;

            utils.showModal(dish.dish_name, content);
        } catch (error) {
            console.error('Ошибка загрузки блюда:', error);
            utils.showToast('Ошибка загрузки блюда', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async createDish() {
        const content = `
            <form id="newDishForm">
                <div class="form-group">
                    <label for="dishName">Название блюда:</label>
                    <input type="text" id="dishName" required>
                </div>
                <div class="form-group">
                    <label for="category">Категория:</label>
                    <select id="category" required>
                        <option value="">Выберите категорию</option>
                        ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="price">Цена (руб):</label>
                    <input type="number" id="price" min="100" max="10000" required>
                </div>
                <div class="form-group">
                    <label for="cookingTime">Время приготовления (чч:мм:сс):</label>
                    <input type="text" id="cookingTime" value="00:30:00" required>
                </div>
                <div class="form-group">
                    <label for="availability">Доступность:</label>
                    <select id="availability">
                        <option value="true">Доступно</option>
                        <option value="false">Недоступно</option>
                    </select>
                </div>
            </form>
        `;

        utils.showModal('Добавить блюдо', content, async () => {
            const dishData = {
                dish_name: document.getElementById('dishName').value,
                category: document.getElementById('category').value,
                price: parseInt(document.getElementById('price').value),
                cooking_time: document.getElementById('cookingTime').value,
                availability: document.getElementById('availability').value === 'true'
            };

            try {
                await api.createDish(dishData);
                utils.showToast('Блюдо успешно добавлено', 'success');
                this.loadMenu();
            } catch (error) {
                utils.showToast(error.message || 'Ошибка добавления блюда', 'error');
            }
        });
    }

    async editDish(dishId) {
        try {
            utils.showLoading();
            const dish = await api.getDishById(dishId);
            
            const content = `
                <form id="editDishForm">
                    <div class="form-group">
                        <label for="editDishName">Название блюда:</label>
                        <input type="text" id="editDishName" value="${dish.dish_name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCategory">Категория:</label>
                        <select id="editCategory" required>
                            ${this.categories.map(cat => 
                                `<option value="${cat}" ${cat === dish.category ? 'selected' : ''}>${cat}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editPrice">Цена (руб):</label>
                        <input type="number" id="editPrice" value="${dish.price}" min="100" max="10000" required>
                    </div>
                    <div class="form-group">
                        <label for="editCookingTime">Время приготовления:</label>
                        <input type="text" id="editCookingTime" value="${dish.cooking_time}" required>
                    </div>
                    <div class="form-group">
                        <label for="editAvailability">Доступность:</label>
                        <select id="editAvailability">
                            <option value="true" ${dish.availability ? 'selected' : ''}>Доступно</option>
                            <option value="false" ${!dish.availability ? 'selected' : ''}>Недоступно</option>
                        </select>
                    </div>
                    <input type="hidden" id="dishId" value="${dishId}">
                </form>
            `;

            utils.showModal('Редактировать блюдо', content, async () => {
                const dishData = {
                    dish_name: document.getElementById('editDishName').value,
                    category: document.getElementById('editCategory').value,
                    price: parseInt(document.getElementById('editPrice').value),
                    cooking_time: document.getElementById('editCookingTime').value,
                    availability: document.getElementById('editAvailability').value === 'true'
                };

                try {
                    await api.updateDish(dishId, dishData);
                    utils.showToast('Блюдо успешно обновлено', 'success');
                    this.loadMenu();
                } catch (error) {
                    utils.showToast(error.message || 'Ошибка обновления блюда', 'error');
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки блюда:', error);
            utils.showToast('Ошибка загрузки блюда', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async deleteDish(dishId) {
        if (!confirm('Вы уверены, что хотите удалить это блюдо?')) return;
        
        try {
            await api.updateDish(dishId, { availability: false });
            utils.showToast('Блюдо отмечено как недоступное', 'success');
            this.loadMenu();
        } catch (error) {
            utils.showToast(error.message || 'Ошибка удаления блюда', 'error');
        }
    }

    applyFilters() {
        const category = document.getElementById('menuCategoryFilter').value;
        const minPrice = document.getElementById('menuMinPrice').value;
        const maxPrice = document.getElementById('menuMaxPrice').value;
        const available = document.getElementById('menuAvailableFilter').value;
        
        this.currentFilters = {};
        if (category) this.currentFilters.category = category;
        if (minPrice) this.currentFilters.min_price = minPrice;
        if (maxPrice) this.currentFilters.max_price = maxPrice;
        if (available !== 'all') this.currentFilters.available = available;
        
        this.loadMenu();
    }

    clearFilters() {
        this.currentFilters = {};
        document.getElementById('menuCategoryFilter').value = '';
        document.getElementById('menuMinPrice').value = '';
        document.getElementById('menuMaxPrice').value = '';
        document.getElementById('menuAvailableFilter').value = 'all';
        this.loadMenu();
    }
}

const menu = new Menu();
window.menu = menu;

// Инициализация меню при загрузке
document.addEventListener('DOMContentLoaded', () => {
    menu.init();
});