// ── Config global ApexCharts ──────────────────────────────
window.Apex = {
    chart: { foreColor: '#c8d0e7', toolbar: { show: false }, fontFamily: 'Montserrat, sans-serif' },
    stroke: { width: 2 },
    dataLabels: { enabled: false },
    tooltip: { theme: 'dark' },
    grid: { borderColor: '#2a3460', xaxis: { lines: { show: true } } },
};

const COLORS = {
    accent: '#6b5cff',
    teal: '#17ead9',
    green: '#28a745',
    yellow: '#ffc107',
    red: '#dc3545',
    purple: '#9c27b0',
};

const API = 'http://localhost:3000/api';  // Cambia si el backend está en otra URL

// ── Crear gráficas ────────────────────────────────────────

// Radial bar
const radialChart = new ApexCharts(document.querySelector('#radialChart'), {
    chart: { type: 'radialBar', height: 300 },
    plotOptions: {
        radialBar: {
            offsetY: 0,
            hollow: { size: '35%', background: 'transparent' },
            track: { show: false },
            dataLabels: {
                name: { fontSize: '13px', color: '#c8d0e7' },
                value: { fontSize: '18px', fontWeight: 700, color: '#fff', formatter: v => v + '%' },
                total: { show: true, label: 'Total', color: '#7a85a3', formatter: () => '100%' }
            },
            startAngle: -180,
            endAngle: 180,
        }
    },
    stroke: { lineCap: 'round' },
    series: [0, 0, 0],
    labels: ['Aprobadas', 'Pendientes', 'Rechazadas'],
    colors: [COLORS.green, COLORS.yellow, COLORS.red],
    legend: { show: true, position: 'bottom', fontSize: '13px' },
});
radialChart.render();

// Line chart
const lineChart = new ApexCharts(document.querySelector('#lineChart'), {
    chart: { type: 'area', height: 300, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: .4, opacityFrom: .5, opacityTo: .05 } },
    series: [{ name: 'Faltas', data: [] }],
    colors: [COLORS.teal],
    xaxis: { categories: [], labels: { rotate: -35, style: { fontSize: '11px' } } },
    markers: { size: 3, hover: { size: 6 } },
});
lineChart.render();

// Bar chart
const barChart = new ApexCharts(document.querySelector('#barChart'), {
    chart: { type: 'bar', height: 300 },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    series: [{ name: 'Faltas', data: [] }],
    colors: [COLORS.accent],
    xaxis: { categories: [] },
});
barChart.render();

// Area chart (by month & status)
const areaChart = new ApexCharts(document.querySelector('#areaChart'), {
    chart: { type: 'area', height: 300, stacked: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: .3, opacityFrom: .6, opacityTo: .05 } },
    series: [
        { name: 'Aprobadas', data: [] },
        { name: 'Pendientes', data: [] },
        { name: 'Rechazadas', data: [] },
    ],
    colors: [COLORS.green, COLORS.yellow, COLORS.red],
    xaxis: { categories: [] },
});
areaChart.render();

// ── KPI helpers ───────────────────────────────────────────
const setKpi = (id, val) => { document.getElementById(id).textContent = val ?? '—'; };

// ── Tabla ─────────────────────────────────────────────────
function renderTable(rows) {
    const tbody = document.getElementById('excusesTable');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sin datos</td></tr>';
        return;
    }
    tbody.innerHTML = rows.slice(0, 15).map((r, i) => `
        <tr>
            <td style="color:var(--muted)">${i + 1}</td>
            <td>${r.nombre}</td>
            <td style="color:var(--muted)">${r.code}</td>
            <td>${r.date_of_absence}</td>
            <td>${r.reason || '—'}</td>
            <td><span class="badge-status badge-${r.status}">${statusLabel(r.status)}</span></td>
        </tr>`).join('');
}

const statusLabel = s => ({ approved: 'Aprobada', pending: 'Pendiente', rejected: 'Rechazada' }[s] || s);

// ── Carga principal ───────────────────────────────────────
async function loadDashboard() {
    try {
        const [dashRes, excusesRes] = await Promise.all([
            fetch(`${API}/stats/dashboard`),
            fetch(`${API}/excuses?limit=15`),
        ]);

        if (!dashRes.ok || !excusesRes.ok) throw new Error('Error de red');

        const data = await dashRes.json();
        const excuses = await excusesRes.json();

        // KPI numbers
        const approved = Math.round((parseFloat(data.byStatus.approved) / 100) * data.totalAbsences);
        const pending = Math.round((parseFloat(data.byStatus.pending) / 100) * data.totalAbsences);
        const rejected = Math.round((parseFloat(data.byStatus.rejected) / 100) * data.totalAbsences);

        setKpi('kpi-total', data.totalAbsences);
        setKpi('kpi-approved', approved);
        setKpi('kpi-pending', pending);
        setKpi('kpi-rejected', rejected);

        // Radial bar
        radialChart.updateSeries([
            parseFloat(data.byStatus.approved),
            parseFloat(data.byStatus.pending),
            parseFloat(data.byStatus.rejected),
        ]);

        // Line chart
        lineChart.updateOptions({ xaxis: { categories: data.byDate.map(d => d.date_of_absence) } });
        lineChart.updateSeries([{ name: 'Faltas', data: data.byDate.map(d => d.total) }]);

        // Bar chart
        barChart.updateOptions({ xaxis: { categories: data.topStudents.map(s => s.nombre) } });
        barChart.updateSeries([{ name: 'Faltas', data: data.topStudents.map(s => s.total) }]);

        // Area chart
        areaChart.updateOptions({ xaxis: { categories: data.byMonth.map(m => m.month) } });
        areaChart.updateSeries([
            { name: 'Aprobadas', data: data.byMonth.map(m => m.approved) },
            { name: 'Pendientes', data: data.byMonth.map(m => m.pending) },
            { name: 'Rechazadas', data: data.byMonth.map(m => m.rejected) },
        ]);

        // Table
        renderTable(excuses);

    } catch (err) {
        console.error('Error cargando dashboard:', err);
    }
}

// ── Arrancar ──────────────────────────────────────────────
loadDashboard();
setInterval(loadDashboard, 10_000);   // actualiza cada 10 seg