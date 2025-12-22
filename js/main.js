// Главный файл со всеми глобальными функциями

// ========== AUTH FUNCTIONS ==========

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        utils.showLoading();
        const data = await api.login(email, password);
        api.setToken(data.token);
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        showMainContent();
        utils.showToast('Успешный вход!', 'success');
    } catch (error) {
        utils.showToast(error.message || 'Ошибка входа', 'error');
    } finally {
        utils.hideLoading();
    }
}

async function handleRegister() {
    const full_name = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    try {
        utils.showLoading();
        await api.register({ email, password, full_name, role });
        utils.showToast('Регистрация успешна! Войдите в систему.', 'success');
        showLogin();
    } catch (error) {
        utils.showToast(error.message || 'Ошибка регистрации', 'error');
    } finally {
        utils.hideLoading();
    }
}

function logout() {
    api.clearToken();
    localStorage.removeItem('user');
    currentUser = null;
    showAuth();
    utils.showToast('Вы вышли из системы', 'success');
}

function showAuth() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    showLogin();
}

function showMainContent() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    updateUserInfo();
    updateNavigation();
    loadDashboard();
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('regFullName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role;
        document.getElementById('welcomeName').textContent = currentUser.name;
        document.getElementById('userRoleInfo').textContent = currentUser.role;
    }
}

function updateNavigation() {
    const inventoryLink = document.getElementById('inventoryLink');
    const reportsLink = document.getElementById('reportsLink');
    const menuLink = document.getElementById('menuLink');
    
    const allowedRolesForInventory = ['manager', 'chef', 'head_chef'];
    const allowedRolesForReports = ['manager', 'analyst'];
    const allowedRolesForMenu = ['manager', 'chef', 'head_chef'];
    
    inventoryLink.style.display = allowedRolesForInventory.includes(currentUser?.role) ? 'flex' : 'none';
    reportsLink.style.display = allowedRolesForReports.includes(currentUser?.role) ? 'flex' : 'none';
    menuLink.style.display = allowedRolesForMenu.includes(currentUser?.role) ? 'flex' : 'none';
}

// ========== DASHBOARD FUNCTIONS ==========

async function loadDashboard() {
    try {
        utils.showLoading();
        
        // Загрузка статистики
        const stats = await api.getDailyStats();
        updateDashboardStats(stats);
        
        // Загрузка последних заказов
        const orders = await api.getOrders({ limit: 5 });
        updateRecentOrders(orders);
        
        // Загрузка ингредиентов с низким запасом
        const lowStock = await api.getLowStockIngredients();
        updateLowStock(lowStock);
        
        // Загрузка популярных блюд
        const popularDishes = await api.getPopularDishes({ limit: 5 });
        updatePopularDishes(popularDishes);
        
    } catch (error) {
        console.error('Ошибка загрузки дашборда:', error);
        utils.showToast('Ошибка загрузки данных', 'error');
    } finally {
        utils.hideLoading();
    }
}

function updateDashboardStats(stats) {
    document.getElementById('todayOrders').textContent = stats.today_orders || 0;
    document.getElementById('todayRevenue').textContent = utils.formatCurrency(stats.today_revenue || 0);
    document.getElementById('expiringSoon').textContent = stats.expiring_today || 0;
    document.getElementById('activeOrders').textContent = stats.active_orders || 0;
}

function updateRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p>Нет заказов за сегодня</p>';
        return;
    }

    let html = '<table><thead><tr><th>ID</th><th>Тип</th><th>Время</th><th>Статус</th><th>Сумма</th></tr></thead><tbody>';
    
    orders.forEach(order => {
        html += `
            <tr onclick="viewOrder(${order.order_id})" style="cursor: pointer;">
                <td>#${order.order_id}</td>
                <td>${order.type === 'offline' ? 'В зале' : 'Доставка'}</td>
                <td>${utils.formatDate(order.datetime)}</td>
                <td><span class="status-badge status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
                <td>${utils.formatCurrency(order.total_price)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateLowStock(lowStock) {
    const container = document.getElementById('lowStockItems');
    if (!container) return;

    if (!lowStock || lowStock.length === 0) {
        container.innerHTML = '<p>Все ингредиенты в достаточном количестве</p>';
        return;
    }

    let html = '<ul>';
    lowStock.slice(0, 5).forEach(item => {
        html += `
            <li onclick="editIngredient(${item.ingredient_id})" style="cursor: pointer; padding: 5px 0;">
                <strong>${item.ingredient_name}</strong>: ${item.quantity} ${item.unit}
                <span style="color: #e74c3c; font-size: 0.9em;">(мало)</span>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

function updatePopularDishes(dishes) {
    const container = document.getElementById('popularDishes');
    if (!container) return;

    if (!dishes || dishes.length === 0) {
        container.innerHTML = '<p>Нет данных о популярных блюдах</p>';
        return;
    }

    let html = '<ol>';
    dishes.forEach(dish => {
        html += `
            <li onclick="viewDish(${dish.dish_id})" style="cursor: pointer; padding: 5px 0;">
                <strong>${dish.dish_name}</strong> - ${dish.times_ordered} заказов
            </li>
        `;
    });
    html += '</ol>';
    container.innerHTML = html;
}

// ========== ORDERS FUNCTIONS ==========

async function loadOrders() {
    try {
        utils.showLoading();
        const orders = await api.getOrders(currentOrderFilters);
        renderOrders(orders);
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        utils.showToast('Ошибка загрузки заказов', 'error');
    } finally {
        utils.hideLoading();
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Заказы не найдены</td></tr>';
        return;
    }

    let html = '';
    orders.forEach(order => {
        html += `
            <tr>
                <td>#${order.order_id}</td>
                <td>${order.type === 'offline' ? 'В зале' : 'Доставка'}</td>
                <td>${utils.formatDate(order.datetime)}</td>
                <td><span class="status-badge status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
                <td>${utils.formatCurrency(order.total_price)}</td>
                <td>
                    <button class="btn-small" onclick="viewOrder(${order.order_id})">Просмотр</button>
                    ${currentUser?.role === 'manager' ? 
                        `<button class="btn-small btn-warning" onclick="updateOrderStatus(${order.order_id})">Изменить статус</button>` : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function viewOrder(orderId) {
    try {
        utils.showLoading();
        const order = await api.getOrderById(orderId);
        
        let positionsHtml = '';
        if (order.positions && order.positions.length > 0) {
            positionsHtml = '<h4>Позиции заказа:</h4><table><thead><tr><th>Блюдо</th><th>Количество</th><th>Цена</th><th>Статус</th><th>Действия</th></tr></thead><tbody>';
            
            order.positions.forEach(position => {
                positionsHtml += `
                    <tr>
                        <td>${position.dish_name}</td>
                        <td>${position.quantity}</td>
                        <td>${utils.formatCurrency(position.price)}</td>
                        <td><span class="status-badge ${position.is_ready ? 'status-готов' : 'status-не-готов'}">
                            ${position.is_ready ? 'Готов' : 'Не готов'}
                        </span></td>
                        <td>
                            ${currentUser?.role === 'chef' || currentUser?.role === 'head_chef' ? 
                                `<button class="btn-small ${position.is_ready ? 'btn-warning' : 'btn-success'}" 
                                 onclick="togglePositionStatus(${order.order_id}, ${position.position_id}, ${!position.is_ready})">
                                    ${position.is_ready ? 'Отметить не готовым' : 'Отметить готовым'}
                                </button>` : ''}
                        </td>
                    </tr>
                `;
            });
            
            positionsHtml += '</tbody></table>';
        }

        const content = `
            <div class="order-details">
                <p><strong>ID:</strong> #${order.order_id}</p>
                <p><strong>Тип:</strong> ${order.type === 'offline' ? 'В зале' : 'Доставка'}</p>
                <p><strong>Дата:</strong> ${utils.formatDate(order.datetime)}</p>
                <p><strong>Статус:</strong> <span class="status-badge status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></p>
                <p><strong>Заведение:</strong> ${order.establishment_name}</p>
                <p><strong>Сотрудник:</strong> ${order.employee_name}</p>
                ${order.table_number ? `<p><strong>Столик:</strong> ${order.table_number}</p>` : ''}
                ${order.customer_address ? `<p><strong>Адрес доставки:</strong> ${order.customer_address}</p>` : ''}
                ${order.total_price ? `<p><strong>Сумма:</strong> ${utils.formatCurrency(order.total_price)}</p>` : ''}
                ${order.rating ? `<p><strong>Рейтинг:</strong> ${'★'.repeat(order.rating)}${'☆'.repeat(5 - order.rating)}</p>` : ''}
                ${positionsHtml}
            </div>
        `;

        utils.showModal(`Заказ #${order.order_id}`, content);
    } catch (error) {
        console.error('Ошибка загрузки заказа:', error);
        utils.showToast('Ошибка загрузки заказа', 'error');
    } finally {
        utils.hideLoading();
    }
}

async function createOrder() {
    const content = `
        <form id="newOrderForm">
            <div class="form-group">
                <label for="orderType">Тип заказа:</label>
                <select id="orderType" required onchange="toggleOrderFields()">
                    <option value="">Выберите тип</option>
                    <option value="offline">В зале</option>
                    <option value="online">Доставка</option>
                </select>
            </div>
            <div class="form-group" id="tableNumberGroup" style="display: none;">
                <label for="tableNumber">Номер столика:</label>
                <input type="number" id="tableNumber" min="1">
            </div>
            <div class="form-group" id="addressGroup" style="display: none;">
                <label for="customerAddress">Адрес доставки:</label>
                <textarea id="customerAddress" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label>Блюда:</label>
                <div id="orderPositions">
                    <div class="position-row">
                        <select class="dishSelect" onchange="updatePositionPrice(this)">
                            <option value="">Выберите блюдо</option>
                        </select>
                        <input type="number" class="quantity" min="1" value="1" style="width: 80px;" onchange="updatePositionTotal(this)">
                        <span class="position-price" style="margin: 0 10px;">0 ₽</span>
                        <button type="button" class="btn-small btn-danger remove-position">×</button>
                    </div>
                </div>
                <button type="button" class="btn-small" onclick="addPositionRow()">+ Добавить блюдо</button>
            </div>
            <div class="form-group">
                <label for="notes">Примечания:</label>
                <textarea id="notes" rows="3"></textarea>
            </div>
            <div class="form-group">
                <strong>Итого: <span id="orderTotal">0</span> ₽</strong>
            </div>
        </form>
    `;

    utils.showModal('Новый заказ', content, async () => {
        const orderType = document.getElementById('orderType').value;
        const tableNumber = document.getElementById('tableNumber').value;
        const customerAddress = document.getElementById('customerAddress').value;
        const notes = document.getElementById('notes').value;

        // Сбор позиций
        const positions = [];
        const positionRows = document.querySelectorAll('.position-row');
        positionRows.forEach(row => {
            const dishId = row.querySelector('.dishSelect').value;
            const quantity = row.querySelector('.quantity').value;
            if (dishId && quantity) {
                positions.push({
                    dish_id: parseInt(dishId),
                    quantity: parseInt(quantity),
                    notes: notes
                });
            }
        });

        if (positions.length === 0) {
            utils.showToast('Добавьте хотя бы одно блюдо', 'error');
            return;
        }

        const orderData = {
            type: orderType,
            table_number: orderType === 'offline' ? parseInt(tableNumber) : null,
            customer_address: orderType === 'online' ? customerAddress : null,
            establishment_id: 1,
            positions: positions
        };

        try {
            await api.createOrder(orderData);
            utils.showToast('Заказ успешно создан', 'success');
            loadOrders();
        } catch (error) {
            utils.showToast(error.message || 'Ошибка создания заказа', 'error');
        }
    });

    // Загрузка блюд для выбора
    loadDishesForOrder();
}

async function loadDishesForOrder() {
    try {
        const dishes = await api.getMenu({ available: 'true' });
        const select = document.querySelector('.dishSelect');
        dishes.forEach(dish => {
            const option = document.createElement('option');
            option.value = dish.dish_id;
            option.textContent = `${dish.dish_name} - ${utils.formatCurrency(dish.price)}`;
            option.dataset.price = dish.price;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки блюд:', error);
    }
}

function toggleOrderFields() {
    const type = document.getElementById('orderType').value;
    document.getElementById('tableNumberGroup').style.display = type === 'offline' ? 'block' : 'none';
    document.getElementById('addressGroup').style.display = type === 'online' ? 'block' : 'none';
}

function addPositionRow() {
    const positionsDiv = document.getElementById('orderPositions');
    const newRow = document.createElement('div');
    newRow.className = 'position-row';
    newRow.innerHTML = `
        <select class="dishSelect" onchange="updatePositionPrice(this)">
            <option value="">Выберите блюдо</option>
        </select>
        <input type="number" class="quantity" min="1" value="1" style="width: 80px;" onchange="updatePositionTotal(this)">
        <span class="position-price" style="margin: 0 10px;">0 ₽</span>
        <button type="button" class="btn-small btn-danger remove-position">×</button>
    `;
    positionsDiv.appendChild(newRow);
    
    // Копировать опции блюд
    const firstSelect = positionsDiv.querySelector('.dishSelect');
    if (firstSelect) {
        const newSelect = newRow.querySelector('.dishSelect');
        Array.from(firstSelect.options).forEach(option => {
            newSelect.appendChild(option.cloneNode(true));
        });
    }
    
    // Назначить обработчики удаления
    newRow.querySelector('.remove-position').onclick = () => {
        newRow.remove();
        calculateOrderTotal();
    };
}

function updatePositionPrice(select) {
    const price = select.selectedOptions[0]?.dataset.price || 0;
    const row = select.closest('.position-row');
    const priceSpan = row.querySelector('.position-price');
    const quantity = row.querySelector('.quantity').value;
    priceSpan.textContent = utils.formatCurrency(price * quantity);
    calculateOrderTotal();
}

function updatePositionTotal(input) {
    const row = input.closest('.position-row');
    const select = row.querySelector('.dishSelect');
    const price = select.selectedOptions[0]?.dataset.price || 0;
    const quantity = input.value;
    const priceSpan = row.querySelector('.position-price');
    priceSpan.textContent = utils.formatCurrency(price * quantity);
    calculateOrderTotal();
}

function calculateOrderTotal() {
    let total = 0;
    document.querySelectorAll('.position-row').forEach(row => {
        const price = row.querySelector('.dishSelect').selectedOptions[0]?.dataset.price || 0;
        const quantity = row.querySelector('.quantity').value || 0;
        total += price * quantity;
    });
    document.getElementById('orderTotal').textContent = total;
}

async function updateOrderStatus(orderId) {
    const content = `
        <div class="form-group">
            <label for="newStatus">Новый статус:</label>
            <select id="newStatus" required>
                <option value="Создан">Создан</option>
                <option value="В процессе">В процессе</option>
                <option value="Завершен">Завершен</option>
                <option value="Отменен">Отменен</option>
            </select>
        </div>
    `;

    utils.showModal('Изменение статуса заказа', content, async () => {
        const newStatus = document.getElementById('newStatus').value;
        try {
            await api.updateOrder(orderId, { status: newStatus });
            utils.showToast('Статус заказа обновлен', 'success');
            loadOrders();
        } catch (error) {
            utils.showToast(error.message || 'Ошибка обновления статуса', 'error');
        }
    });
}

async function togglePositionStatus(orderId, positionId, isReady) {
    try {
        await api.updatePositionStatus(orderId, positionId, isReady);
        utils.showToast('Статус позиции обновлен', 'success');
        viewOrder(orderId); // Обновить просмотр заказа
    } catch (error) {
        utils.showToast(error.message || 'Ошибка обновления статуса', 'error');
    }
}

function applyOrderFilters() {
    const status = document.getElementById('orderStatusFilter').value;
    const startDate = document.getElementById('orderStartDate').value;
    const endDate = document.getElementById('orderEndDate').value;
    
    currentOrderFilters = {};
    if (status) currentOrderFilters.status = status;
    if (startDate) currentOrderFilters.start_date = startDate;
    if (endDate) currentOrderFilters.end_date = endDate;
    
    loadOrders();
}

function clearOrderFilters() {
    currentOrderFilters = {};
    document.getElementById('orderStatusFilter').value = '';
    document.getElementById('orderStartDate').value = '';
    document.getElementById('orderEndDate').value = '';
    loadOrders();
}

// ========== INVENTORY FUNCTIONS ==========

async function loadInventory() {
    try {
        utils.showLoading();
        const ingredients = await api.getInventory(currentInventoryFilters);
        renderInventory(ingredients);
    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        utils.showToast('Ошибка загрузки инвентаря', 'error');
    } finally {
        utils.hideLoading();
    }
}

function renderInventory(ingredients) {
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
                    <button class="btn-small" onclick="editIngredient(${ingredient.ingredient_id})">Изменить</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function loadLowStock() {
    try {
        utils.showLoading();
        const ingredients = await api.getLowStockIngredients();
        renderInventory(ingredients);
        utils.showToast(`Найдено ${ingredients.length} ингредиентов с низким запасом`, 'warning');
    } catch (error) {
        console.error('Ошибка загрузки ингредиентов:', error);
        utils.showToast('Ошибка загрузки ингредиентов', 'error');
    } finally {
        utils.hideLoading();
    }
}

async function loadExpiringSoon() {
    try {
        utils.showLoading();
        const ingredients = await api.getExpiringSoon();
        renderInventory(ingredients);
        utils.showToast(`Найдено ${ingredients.length} скоро истекающих ингредиентов`, 'warning');
    } catch (error) {
        console.error('Ошибка загрузки ингредиентов:', error);
        utils.showToast('Ошибка загрузки ингредиентов', 'error');
    } finally {
        utils.hideLoading();
    }
}

async function addIngredient() {
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
                loadInventory();
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

async function editIngredient(ingredientId) {
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
                loadInventory();
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

function applyInventoryFilters() {
    const status = document.getElementById('inventoryStatusFilter').value;
    
    currentInventoryFilters = {};
    
    if (status === 'expiring') {
        loadExpiringSoon();
        return;
    } else if (status === 'low') {
        loadLowStock();
        return;
    }
    
    loadInventory();
}

function clearInventoryFilters() {
    currentInventoryFilters = {};
    document.getElementById('inventoryStatusFilter').value = '';
    loadInventory();
}

// ========== MENU FUNCTIONS ==========

let menuCategories = [];

async function loadMenu() {
    try {
        utils.showLoading();
        
        // Загрузить категории при первом вызове
        if (menuCategories.length === 0) {
            menuCategories = await api.getCategories();
            populateCategoryFilter();
        }
        
        const dishes = await api.getMenu(currentMenuFilters);
        renderMenu(dishes);
    } catch (error) {
        console.error('Ошибка загрузки меню:', error);
        utils.showToast('Ошибка загрузки меню', 'error');
    } finally {
        utils.hideLoading();
    }
}

function populateCategoryFilter() {
    const filter = document.getElementById('menuCategoryFilter');
    if (!filter) return;

    filter.innerHTML = '<option value="">Все категории</option>';
    menuCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filter.appendChild(option);
    });
}

function renderMenu(dishes) {
    const container = document.getElementById('menuContainer');
    if (!container) return;

    if (!dishes || dishes.length === 0) {
        container.innerHTML = '<p style="text-align: center;">Блюда не найдены</p>';
        return;
    }

    let html = '';
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
                    <button class="btn-small" onclick="viewDish(${dish.dish_id})">Подробнее</button>
                    ${currentUser?.role === 'manager' || currentUser?.role === 'chef' || currentUser?.role === 'head_chef' ? 
                        `<button class="btn-small btn-warning" onclick="editDish(${dish.dish_id})">Изменить</button>` : ''}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function viewDish(dishId) {
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

async function createDish() {
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
                    ${menuCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
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
            loadMenu();
        } catch (error) {
            utils.showToast(error.message || 'Ошибка добавления блюда', 'error');
        }
    });
}

async function editDish(dishId) {
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
                        ${menuCategories.map(cat => 
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
                loadMenu();
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

function applyMenuFilters() {
    const category = document.getElementById('menuCategoryFilter').value;
    const minPrice = document.getElementById('menuMinPrice').value;
    const maxPrice = document.getElementById('menuMaxPrice').value;
    const available = document.getElementById('menuAvailableFilter').value;
    
    currentMenuFilters = {};
    if (category) currentMenuFilters.category = category;
    if (minPrice) currentMenuFilters.min_price = minPrice;
    if (maxPrice) currentMenuFilters.max_price = maxPrice;
    if (available !== 'all') currentMenuFilters.available = available;
    
    loadMenu();
}

function clearMenuFilters() {
    currentMenuFilters = {};
    document.getElementById('menuCategoryFilter').value = '';
    document.getElementById('menuMinPrice').value = '';
    document.getElementById('menuMaxPrice').value = '';
    document.getElementById('menuAvailableFilter').value = 'all';
    loadMenu();
}

// ========== REPORTS FUNCTIONS ==========

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    
    switch(reportType) {
        case 'sales':
            await loadSalesReport();
            break;
        case 'inventory':
            await loadInventoryReport();
            break;
        case 'employees':
            await loadEmployeePerformance();
            break;
        case 'dishes':
            await loadPopularDishes();
            break;
    }
}

async function loadSalesReport() {
    try {
        utils.showLoading();
        
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        const filters = {};
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;
        
        const report = await api.getSalesReport(filters);
        renderSalesReport(report);
        
    } catch (error) {
        console.error('Ошибка загрузки отчета продаж:', error);
        utils.showToast('Ошибка загрузки отчета продаж', 'error');
    } finally {
        utils.hideLoading();
    }
}

function renderSalesReport(report) {
    const container = document.getElementById('salesReportTable');
    if (!container) return;

    if (!report || report.length === 0) {
        container.innerHTML = '<p>Нет данных за выбранный период</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Дата</th>
                    <th>Кол-во заказов</th>
                    <th>Выручка</th>
                    <th>Средний чек</th>
                    <th>Чаевые</th>
                    <th>Рейтинг</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalTips = 0;
    
    report.forEach(item => {
        totalOrders += item.total_orders || 0;
        totalRevenue += item.total_revenue || 0;
        totalTips += item.total_tips || 0;
        
        html += `
            <tr>
                <td>${item.date}</td>
                <td>${item.total_orders}</td>
                <td>${utils.formatCurrency(item.total_revenue)}</td>
                <td>${utils.formatCurrency(item.avg_order_value)}</td>
                <td>${utils.formatCurrency(item.total_tips)}</td>
                <td>${item.avg_rating ? item.avg_rating.toFixed(1) : '-'}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
            <tfoot>
                <tr>
                    <th>Итого:</th>
                    <th>${totalOrders}</th>
                    <th>${utils.formatCurrency(totalRevenue)}</th>
                    <th>${utils.formatCurrency(totalRevenue / (totalOrders || 1))}</th>
                    <th>${utils.formatCurrency(totalTips)}</th>
                    <th></th>
                </tr>
            </tfoot>
        </table>
    `;
    
    container.innerHTML = html;
}

async function loadInventoryReport() {
    try {
        utils.showLoading();
        const report = await api.getInventoryReport();
        renderInventoryReport(report);
    } catch (error) {
        console.error('Ошибка загрузки отчета инвентаря:', error);
        utils.showToast('Ошибка загрузки отчета инвентаря', 'error');
    } finally {
        utils.hideLoading();
    }
}

function renderInventoryReport(report) {
    const container = document.getElementById('inventoryReportTable');
    if (!container) return;

    if (!report || report.length === 0) {
        container.innerHTML = '<p>Нет данных об инвентаре</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Заведение</th>
                    <th>Ингредиентов</th>
                    <th>Общее количество</th>
                    <th>Просрочено</th>
                    <th>Скоро истекает</th>
                    <th>Потери</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    report.forEach(item => {
        html += `
            <tr>
                <td>${item.establishment}</td>
                <td>${item.total_ingredients}</td>
                <td>${item.total_quantity}</td>
                <td><span class="status-badge status-просрочен">${item.expired_count}</span></td>
                <td><span class="status-badge status-скоро-истекает">${item.expiring_soon_count}</span></td>
                <td>${utils.formatCurrency((item.expired_cost || 0) + (item.expiring_soon_cost || 0))}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function loadEmployeePerformance() {
    try {
        utils.showLoading();
        const performance = await api.getEmployeePerformance();
        renderEmployeePerformance(performance);
    } catch (error) {
        console.error('Ошибка загрузки отчета сотрудников:', error);
        utils.showToast('Ошибка загрузки отчета сотрудников', 'error');
    } finally {
        utils.hideLoading();
    }
}

function renderEmployeePerformance(performance) {
    const container = document.getElementById('employeePerformanceTable');
    if (!container) return;

    if (!performance || performance.length === 0) {
        container.innerHTML = '<p>Нет данных о сотрудниках</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Сотрудник</th>
                    <th>Заказы</th>
                    <th>Общее время</th>
                    <th>Выручка</th>
                    <th>Средний рейтинг</th>
                    <th>Эффективность</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    performance.forEach(emp => {
        const efficiency = emp.total_time_seconds > 0 ? 
            (emp.total_revenue / emp.total_time_seconds * 3600).toFixed(2) : 0;
        
        html += `
            <tr>
                <td>${emp.full_name}</td>
                <td>${emp.total_orders}</td>
                <td>${formatTime(emp.total_time_seconds)}</td>
                <td>${utils.formatCurrency(emp.total_revenue)}</td>
                <td>${emp.avg_rating ? emp.avg_rating.toFixed(1) : '-'}</td>
                <td>${efficiency} руб/час</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function formatTime(seconds) {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

async function loadPopularDishes() {
    try {
        utils.showLoading();
        
        const startDate = document.getElementById('dishesStartDate')?.value;
        const endDate = document.getElementById('dishesEndDate')?.value;
        
        const filters = {};
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;
        
        const dishes = await api.getPopularDishes(filters);
        renderPopularDishes(dishes);
        
    } catch (error) {
        console.error('Ошибка загрузки популярных блюд:', error);
        utils.showToast('Ошибка загрузки популярных блюд', 'error');
    } finally {
        utils.hideLoading();
    }
}

function renderPopularDishes(dishes) {
    const container = document.getElementById('popularDishesTable');
    if (!container) return;

    if (!dishes || dishes.length === 0) {
        container.innerHTML = '<p>Нет данных о популярных блюдах</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Блюдо</th>
                    <th>Категория</th>
                    <th>Цена</th>
                    <th>Заказов</th>
                    <th>Количество</th>
                    <th>Выручка</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    dishes.forEach(dish => {
        html += `
            <tr>
                <td>${dish.dish_name}</td>
                <td>${dish.category}</td>
                <td>${utils.formatCurrency(dish.price)}</td>
                <td>${dish.times_ordered}</td>
                <td>${dish.total_quantity}</td>
                <td>${utils.formatCurrency(dish.total_revenue)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function exportReport(type) {
    try {
        utils.showLoading();
        
        let data, filename;
        
        switch(type) {
            case 'sales':
                const salesData = await api.getSalesReport({
                    start_date: document.getElementById('reportStartDate').value,
                    end_date: document.getElementById('reportEndDate').value
                });
                data = salesData;
                filename = `sales_report_${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            case 'inventory':
                const inventoryData = await api.getInventoryReport();
                data = inventoryData;
                filename = `inventory_report_${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            case 'employees':
                const employeesData = await api.getEmployeePerformance();
                data = employeesData;
                filename = `employee_performance_${new Date().toISOString().split('T')[0]}.json`;
                break;
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        utils.showToast('Отчет успешно экспортирован', 'success');
    } catch (error) {
        console.error('Ошибка экспорта отчета:', error);
        utils.showToast('Ошибка экспорта отчета', 'error');
    } finally {
        utils.hideLoading();
    }
}