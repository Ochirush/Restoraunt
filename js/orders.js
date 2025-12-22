class Orders {
    constructor() {
        this.currentFilters = {};
    }

    async loadOrders() {
        try {
            utils.showLoading();
            const orders = await api.getOrders(this.currentFilters);
            this.renderOrders(orders);
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            utils.showToast('Ошибка загрузки заказов', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderOrders(orders) {
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
                        <button class="btn-small" onclick="orders.viewOrder(${order.order_id})">Просмотр</button>
                        ${auth.currentUser.role === 'manager' ? 
                            `<button class="btn-small btn-warning" onclick="orders.updateOrderStatus(${order.order_id})">Изменить статус</button>` : ''}
                        ${auth.currentUser.role === 'manager' ? 
                            `<button class="btn-small btn-danger" onclick="orders.deleteOrder(${order.order_id})">Удалить</button>` : ''}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async viewOrder(orderId) {
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
                                ${auth.currentUser.role === 'chef' || auth.currentUser.role === 'head_chef' ? 
                                    `<button class="btn-small ${position.is_ready ? 'btn-warning' : 'btn-success'}" 
                                     onclick="orders.togglePositionStatus(${order.order_id}, ${position.position_id}, ${!position.is_ready})">
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

    async createOrder() {
        const content = `
            <form id="newOrderForm">
                <div class="form-group">
                    <label for="orderType">Тип заказа:</label>
                    <select id="orderType" required>
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
                            <select class="dishSelect">
                                <option value="">Выберите блюдо</option>
                            </select>
                            <input type="number" class="quantity" min="1" value="1" style="width: 80px;">
                            <button type="button" class="btn-small btn-danger remove-position">×</button>
                        </div>
                    </div>
                    <button type="button" class="btn-small" onclick="orders.addPositionRow()">+ Добавить блюдо</button>
                </div>
                <div class="form-group">
                    <label for="notes">Примечания:</label>
                    <textarea id="notes" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = utils.showModal('Новый заказ', content, async () => {
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
                establishment_id: 1, // Для демо
                positions: positions
            };

            try {
                await api.createOrder(orderData);
                utils.showToast('Заказ успешно создан', 'success');
                this.loadOrders();
            } catch (error) {
                utils.showToast(error.message || 'Ошибка создания заказа', 'error');
            }
        });

        // Загрузка блюд для выбора
        this.loadDishesForSelect(modal);
        
        // Обработчики изменения типа заказа
        modal.querySelector('#orderType').addEventListener('change', (e) => {
            const type = e.target.value;
            modal.querySelector('#tableNumberGroup').style.display = type === 'offline' ? 'block' : 'none';
            modal.querySelector('#addressGroup').style.display = type === 'online' ? 'block' : 'none';
        });

        // Удаление строк позиций
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-position')) {
                e.target.closest('.position-row').remove();
            }
        });
    }

    async loadDishesForSelect(modal) {
        try {
            const dishes = await api.getMenu({ available: 'true' });
            const select = modal.querySelector('.dishSelect');
            dishes.forEach(dish => {
                const option = document.createElement('option');
                option.value = dish.dish_id;
                option.textContent = `${dish.dish_name} - ${utils.formatCurrency(dish.price)}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Ошибка загрузки блюд:', error);
        }
    }

    addPositionRow() {
        const positionsDiv = document.getElementById('orderPositions');
        const newRow = document.createElement('div');
        newRow.className = 'position-row';
        newRow.innerHTML = `
            <select class="dishSelect">
                <option value="">Выберите блюдо</option>
            </select>
            <input type="number" class="quantity" min="1" value="1" style="width: 80px;">
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
    }

    async updateOrderStatus(orderId) {
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
                this.loadOrders();
            } catch (error) {
                utils.showToast(error.message || 'Ошибка обновления статуса', 'error');
            }
        });
    }

    async togglePositionStatus(orderId, positionId, isReady) {
        try {
            await api.updatePositionStatus(orderId, positionId, isReady);
            utils.showToast('Статус позиции обновлен', 'success');
            this.viewOrder(orderId); // Обновить просмотр заказа
        } catch (error) {
            utils.showToast(error.message || 'Ошибка обновления статуса', 'error');
        }
    }

    async deleteOrder(orderId) {
        if (!confirm('Вы уверены, что хотите удалить этот заказ?')) return;
        
        try {
            await api.updateOrder(orderId, { status: 'Отменен' });
            utils.showToast('Заказ отменен', 'success');
            this.loadOrders();
        } catch (error) {
            utils.showToast(error.message || 'Ошибка отмены заказа', 'error');
        }
    }

    applyFilters() {
        const status = document.getElementById('orderStatusFilter').value;
        const startDate = document.getElementById('orderStartDate')?.value;
        const endDate = document.getElementById('orderEndDate')?.value;
        
        this.currentFilters = {};
        if (status) this.currentFilters.status = status;
        if (startDate) this.currentFilters.start_date = startDate;
        if (endDate) this.currentFilters.end_date = endDate;
        
        this.loadOrders();
    }

    clearFilters() {
        this.currentFilters = {};
        document.getElementById('orderStatusFilter').value = '';
        if (document.getElementById('orderStartDate')) document.getElementById('orderStartDate').value = '';
        if (document.getElementById('orderEndDate')) document.getElementById('orderEndDate').value = '';
        this.loadOrders();
    }
}

const orders = new Orders();
window.orders = orders;