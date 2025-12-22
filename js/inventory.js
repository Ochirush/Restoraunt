class Inventory {
    constructor() {
        this.currentFilters = {};
    }

    async loadInventory() {
        try {
            utils.showLoading();
            const ingredients = await api.getInventory(this.currentFilters);
            this.renderInventory(ingredients);
        } catch (error) {
            console.error('Ошибка загрузки инвентаря:', error);
            utils.showToast('Ошибка загрузки инвентаря', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderInventory(ingredients) {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        if (!ingredients || ingredients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Ингредиенты не найдены</td></tr>';
            return;
        }

        let html = '';
        ingredients.forEach(ingredient => {
            let statusClass = '';
            let statusText = ingredient.expiration_status;
            
            if (ingredient.expiration_status === 'Просрочен') {
                statusClass = 'status-просрочен';
            } else if (ingredient.expiration_status === 'Скоро истекает') {
                statusClass = 'status-скоро-истекает';
            } else {
                statusClass = 'status-норма';
            }

            html += `
                <tr>
                    <td>${ingredient.ingredient_name}</td>
                    <td>${ingredient.quantity} ${ingredient.unit}</td>
                    <td>${ingredient.unit}</td>
                    <td>${utils.formatDate(ingredient.expiration_date)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${ingredient.supplier_name}</td>
                    <td>
                        <button class="btn-small" onclick="inventory.editIngredient(${ingredient.ingredient_id})">Изменить</button>
                        ${auth.currentUser.role === 'manager' ? 
                            `<button class="btn-small btn-danger" onclick="inventory.deleteIngredient(${ingredient.ingredient_id})">Удалить</button>` : ''}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadLowStock() {
        try {
            utils.showLoading();
            const ingredients = await api.getLowStockIngredients();
            this.renderInventory(ingredients);
            utils.showToast(`Найдено ${ingredients.length} ингредиентов с низким запасом`, 'warning');
        } catch (error) {
            console.error('Ошибка загрузки ингредиентов:', error);
            utils.showToast('Ошибка загрузки ингредиентов', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async loadExpiringSoon() {
        try {
            utils.showLoading();
            const ingredients = await api.getExpiringSoon();
            this.renderInventory(ingredients);
            utils.showToast(`Найдено ${ingredients.length} скоро истекающих ингредиентов`, 'warning');
        } catch (error) {
            console.error('Ошибка загрузки ингредиентов:', error);
            utils.showToast('Ошибка загрузки ингредиентов', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async addIngredient() {
        try {
            const suppliers = await api.getSuppliers();
            let suppliersOptions = '';
            suppliers.forEach(supplier => {
                suppliersOptions += `<option value="${supplier.supplier_id}">${supplier.supplier_name}</option>`;
            });

            const content = `
                <form id="newIngredientForm">
                    <div class="form-group">
                        <label for="ingredientName">Название ингредиента:</label>
                        <input type="text" id="ingredientName" required>
                    </div>
                    <div class="form-group">
                        <label for="quantity">Количество:</label>
                        <input type="number" id="quantity" step="0.01" min="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="unit">Единица измерения:</label>
                        <select id="unit" required>
                            <option value="кг">кг</option>
                            <option value="гр">гр</option>
                            <option value="л">л</option>
                            <option value="мл">мл</option>
                            <option value="шт">шт</option>
                            <option value="т">т</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dateOfDelivery">Дата поставки:</label>
                        <input type="date" id="dateOfDelivery" required>
                    </div>
                    <div class="form-group">
                        <label for="expirationDate">Срок годности:</label>
                        <input type="date" id="expirationDate" required>
                    </div>
                    <div class="form-group">
                        <label for="supplierId">Поставщик:</label>
                        <select id="supplierId" required>
                            <option value="">Выберите поставщика</option>
                            ${suppliersOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="establishmentId">Заведение:</label>
                        <input type="number" id="establishmentId" value="1" min="1" required>
                    </div>
                </form>
            `;

            utils.showModal('Добавить ингредиент', content, async () => {
                const ingredientData = {
                    ingredient_name: document.getElementById('ingredientName').value,
                    quantity: parseFloat(document.getElementById('quantity').value),
                    unit: document.getElementById('unit').value,
                    date_of_delivery: document.getElementById('dateOfDelivery').value,
                    expiration_date: document.getElementById('expirationDate').value,
                    supplier_id: parseInt(document.getElementById('supplierId').value),
                    establishment_id: parseInt(document.getElementById('establishmentId').value)
                };

                try {
                    await api.addIngredient(ingredientData);
                    utils.showToast('Ингредиент успешно добавлен', 'success');
                    this.loadInventory();
                } catch (error) {
                    utils.showToast(error.message || 'Ошибка добавления ингредиента', 'error');
                }
            });

            // Установка текущей даты по умолчанию
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('dateOfDelivery').value = today;
            
            // Установка срока годности на 7 дней вперед
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            document.getElementById('expirationDate').value = nextWeek;

        } catch (error) {
            console.error('Ошибка загрузки поставщиков:', error);
            utils.showToast('Ошибка загрузки данных', 'error');
        }
    }

    async editIngredient(ingredientId) {
        try {
            utils.showLoading();
            const ingredient = await api.getIngredientById(ingredientId);
            
            const content = `
                <form id="editIngredientForm">
                    <div class="form-group">
                        <label for="editIngredientName">Название ингредиента:</label>
                        <input type="text" id="editIngredientName" value="${ingredient.ingredient_name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editQuantity">Количество:</label>
                        <input type="number" id="editQuantity" value="${ingredient.quantity}" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="editUnit">Единица измерения:</label>
                        <select id="editUnit" required>
                            <option value="кг" ${ingredient.unit === 'кг' ? 'selected' : ''}>кг</option>
                            <option value="гр" ${ingredient.unit === 'гр' ? 'selected' : ''}>гр</option>
                            <option value="л" ${ingredient.unit === 'л' ? 'selected' : ''}>л</option>
                            <option value="мл" ${ingredient.unit === 'мл' ? 'selected' : ''}>мл</option>
                            <option value="шт" ${ingredient.unit === 'шт' ? 'selected' : ''}>шт</option>
                            <option value="т" ${ingredient.unit === 'т' ? 'selected' : ''}>т</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editExpirationDate">Срок годности:</label>
                        <input type="date" id="editExpirationDate" value="${ingredient.expiration_date}" required>
                    </div>
                    <input type="hidden" id="ingredientId" value="${ingredientId}">
                </form>
            `;

            utils.showModal('Редактировать ингредиент', content, async () => {
                const ingredientData = {
                    ingredient_name: document.getElementById('editIngredientName').value,
                    quantity: parseFloat(document.getElementById('editQuantity').value),
                    unit: document.getElementById('editUnit').value,
                    expiration_date: document.getElementById('editExpirationDate').value
                };

                try {
                    await api.updateIngredient(ingredientId, ingredientData);
                    utils.showToast('Ингредиент успешно обновлен', 'success');
                    this.loadInventory();
                } catch (error) {
                    utils.showToast(error.message || 'Ошибка обновления ингредиента', 'error');
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки ингредиента:', error);
            utils.showToast('Ошибка загрузки ингредиента', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    async deleteIngredient(ingredientId) {
        if (!confirm('Вы уверены, что хотите удалить этот ингредиент?')) return;
        
        try {
            await api.updateIngredient(ingredientId, { quantity: 0 });
            utils.showToast('Ингредиент удален', 'success');
            this.loadInventory();
        } catch (error) {
            utils.showToast(error.message || 'Ошибка удаления ингредиента', 'error');
        }
    }

    applyFilters() {
        const establishmentId = document.getElementById('inventoryEstablishmentFilter')?.value;
        const status = document.getElementById('inventoryStatusFilter')?.value;
        
        this.currentFilters = {};
        if (establishmentId) this.currentFilters.establishment_id = establishmentId;
        if (status === 'expiring') {
            this.loadExpiringSoon();
            return;
        } else if (status === 'low') {
            this.loadLowStock();
            return;
        }
        
        this.loadInventory();
    }

    clearFilters() {
        this.currentFilters = {};
        if (document.getElementById('inventoryEstablishmentFilter')) {
            document.getElementById('inventoryEstablishmentFilter').value = '';
        }
        if (document.getElementById('inventoryStatusFilter')) {
            document.getElementById('inventoryStatusFilter').value = '';
        }
        this.loadInventory();
    }
}

const inventory = new Inventory();
window.inventory = inventory;