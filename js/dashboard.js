class Dashboard {
    constructor() {
        this.charts = {};
    }

    async loadDashboardData() {
        try {
            utils.showLoading();
            const role = auth?.currentUser?.role;
            const canViewInventory = ['manager', 'chef', 'head_chef', 'admin'].includes(role);
            
            // Загрузка статистики
            const stats = await api.getDailyStats();
            this.updateStats(stats);
            
            // Загрузка последних заказов
            const orders = await api.getOrders({ limit: 5 });
            this.updateRecentOrders(orders);
            
            // Загрузка ингредиентов с низким запасом
            if (canViewInventory) {
                const lowStock = await api.getLowStockIngredients();
                this.updateLowStock(lowStock);
            } else {
                const container = document.getElementById('lowStockItems');
                if (container) {
                    container.innerHTML = '<p>Недоступно для вашей роли</p>';
                }
            }
            
        } catch (error) {
            console.error('Ошибка загрузки дашборда:', error);
            utils.showToast('Ошибка загрузки данных', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    updateStats(stats) {
        document.getElementById('todayOrders').textContent = stats.today_orders || 0;
        document.getElementById('todayRevenue').textContent = utils.formatCurrency(stats.today_revenue || 0);
        document.getElementById('expiringSoon').textContent = stats.expiring_today || 0;
        document.getElementById('activeOrders').textContent = stats.active_orders || 0;
    }

    updateRecentOrders(orders) {
        const container = document.getElementById('recentOrders');
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = '<p>Нет заказов за сегодня</p>';
            return;
        }

        let html = '<table><thead><tr><th>ID</th><th>Тип</th><th>Время</th><th>Статус</th><th>Сумма</th></tr></thead><tbody>';
        
        orders.forEach(order => {
            html += `
                <tr onclick="orders.viewOrder(${order.order_id})" style="cursor: pointer;">
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

    updateLowStock(lowStock) {
        const container = document.getElementById('lowStockItems');
        if (!container) return;

        if (!lowStock || lowStock.length === 0) {
            container.innerHTML = '<p>Все ингредиенты в достаточном количестве</p>';
            return;
        }

        let html = '<ul>';
        lowStock.slice(0, 5).forEach(item => {
            html += `
                <li onclick="inventory.editIngredient(${item.ingredient_id})" style="cursor: pointer; padding: 5px 0;">
                    <strong>${item.ingredient_name}</strong>: ${item.quantity} ${item.unit}
                    <span style="color: #e74c3c; font-size: 0.9em;">(мало)</span>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
    }

    initCharts() {
        // Инициализация графиков
        this.initSalesChart();
        this.initInventoryChart();
    }

    async initSalesChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        try {
            const salesData = await api.getSalesReport({
                start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0]
            });

            const labels = salesData.map(item => item.date);
            const revenue = salesData.map(item => item.total_revenue);

            this.charts.sales = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Выручка (руб)',
                        data: revenue,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки графика продаж:', error);
        }
    }

    async initInventoryChart() {
        const ctx = document.getElementById('inventoryChart');
        if (!ctx) return;

        try {
            const inventoryReport = await api.getInventoryReport();

            const labels = inventoryReport.map(item => item.establishment);
            const total = inventoryReport.map(item => item.total_quantity);
            const expiring = inventoryReport.map(item => item.expiring_soon_count);

            this.charts.inventory = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Всего ингредиентов',
                            data: total,
                            backgroundColor: '#2ecc71'
                        },
                        {
                            label: 'Скоро истекает',
                            data: expiring,
                            backgroundColor: '#e74c3c'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки графика инвентаря:', error);
        }
    }
}

const dashboard = new Dashboard();
window.dashboard = dashboard;
