class Reports {
    constructor() {
        this.charts = {};
    }

    async loadSalesReport() {
        try {
            utils.showLoading();
            
            const startDate = document.getElementById('reportStartDate').value;
            const endDate = document.getElementById('reportEndDate').value;
            
            const filters = {};
            if (startDate) filters.start_date = startDate;
            if (endDate) filters.end_date = endDate;
            
            const report = await api.getSalesReport(filters);
            this.renderSalesReport(report);
            
            if (this.charts.sales) {
                this.charts.sales.destroy();
            }
            this.initSalesChart(report);
            
        } catch (error) {
            console.error('Ошибка загрузки отчета продаж:', error);
            utils.showToast('Ошибка загрузки отчета продаж', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderSalesReport(report) {
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

    initSalesChart(report) {
        const ctx = document.getElementById('salesChart');
        if (!ctx || !report || report.length === 0) return;

        const labels = report.map(item => item.date);
        const revenue = report.map(item => item.total_revenue || 0);
        const orders = report.map(item => item.total_orders || 0);

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Выручка (руб)',
                        data: revenue,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        yAxisID: 'y',
                        fill: true
                    },
                    {
                        label: 'Количество заказов',
                        data: orders,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        yAxisID: 'y1',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Выручка (руб)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Заказы'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    async loadInventoryReport() {
        try {
            utils.showLoading();
            const report = await api.getInventoryReport();
            this.renderInventoryReport(report);
            
            if (this.charts.inventory) {
                this.charts.inventory.destroy();
            }
            this.initInventoryChart(report);
            
        } catch (error) {
            console.error('Ошибка загрузки отчета инвентаря:', error);
            utils.showToast('Ошибка загрузки отчета инвентаря', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderInventoryReport(report) {
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

    initInventoryChart(report) {
        const ctx = document.getElementById('inventoryChart');
        if (!ctx || !report || report.length === 0) return;

        const labels = report.map(item => item.establishment);
        const normal = report.map(item => item.total_ingredients - (item.expired_count || 0) - (item.expiring_soon_count || 0));
        const expiring = report.map(item => item.expiring_soon_count || 0);
        const expired = report.map(item => item.expired_count || 0);

        this.charts.inventory = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Норма',
                        data: normal,
                        backgroundColor: '#2ecc71'
                    },
                    {
                        label: 'Скоро истекает',
                        data: expiring,
                        backgroundColor: '#f39c12'
                    },
                    {
                        label: 'Просрочено',
                        data: expired,
                        backgroundColor: '#e74c3c'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadEmployeePerformance() {
        try {
            utils.showLoading();
            const performance = await api.getEmployeePerformance();
            this.renderEmployeePerformance(performance);
        } catch (error) {
            console.error('Ошибка загрузки отчета сотрудников:', error);
            utils.showToast('Ошибка загрузки отчета сотрудников', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderEmployeePerformance(performance) {
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
                    <td>${this.formatTime(emp.total_time_seconds)}</td>
                    <td>${utils.formatCurrency(emp.total_revenue)}</td>
                    <td>${emp.avg_rating ? emp.avg_rating.toFixed(1) : '-'}</td>
                    <td>${efficiency} руб/час</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    formatTime(seconds) {
        if (!seconds) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    async loadPopularDishes() {
        try {
            utils.showLoading();
            
            const startDate = document.getElementById('dishesStartDate')?.value;
            const endDate = document.getElementById('dishesEndDate')?.value;
            
            const filters = {};
            if (startDate) filters.start_date = startDate;
            if (endDate) filters.end_date = endDate;
            
            const dishes = await api.getPopularDishes(filters);
            this.renderPopularDishes(dishes);
            
        } catch (error) {
            console.error('Ошибка загрузки популярных блюд:', error);
            utils.showToast('Ошибка загрузки популярных блюд', 'error');
        } finally {
            utils.hideLoading();
        }
    }

    renderPopularDishes(dishes) {
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

    async exportReport(type) {
        try {
            utils.showLoading();
            
            let data, filename, contentType;
            
            switch(type) {
                case 'sales':
                    const salesData = await api.getSalesReport({
                        start_date: document.getElementById('reportStartDate').value,
                        end_date: document.getElementById('reportEndDate').value
                    });
                    data = salesData;
                    filename = `sales_report_${new Date().toISOString().split('T')[0]}.json`;
                    contentType = 'application/json';
                    break;
                    
                case 'inventory':
                    const inventoryData = await api.getInventoryReport();
                    data = inventoryData;
                    filename = `inventory_report_${new Date().toISOString().split('T')[0]}.json`;
                    contentType = 'application/json';
                    break;
                    
                case 'employees':
                    const employeesData = await api.getEmployeePerformance();
                    data = employeesData;
                    filename = `employee_performance_${new Date().toISOString().split('T')[0]}.json`;
                    contentType = 'application/json';
                    break;
            }
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: contentType });
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

    generateReport() {
        const reportType = document.getElementById('reportType').value;
        
        switch(reportType) {
            case 'sales':
                this.loadSalesReport();
                break;
            case 'inventory':
                this.loadInventoryReport();
                break;
            case 'employees':
                this.loadEmployeePerformance();
                break;
            case 'dishes':
                this.loadPopularDishes();
                break;
        }
    }
}

const reports = new Reports();
window.reports = reports;