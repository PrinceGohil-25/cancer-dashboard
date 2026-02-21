// State
let rawData = [];
let filteredData = [];
let state = {
    yearMin: 2000,
    yearMax: 2023,
    selectedTypes: [], // all by default
    metric: 'ASR (World)'
};

// DOM Elements
const yearMinInput = document.getElementById('yearMinVal');
const yearMaxInput = document.getElementById('yearMaxVal');
const rangeMin = document.getElementById('yearRangeMin');
const rangeMax = document.getElementById('yearRangeMax');
const cancerTypeContainer = document.getElementById('cancerTypeFilter');
const metricSelect = document.getElementById('metricSelect');
const selectAllBtn = document.getElementById('selectAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const showTrendlineCheckbox = document.getElementById('showTrendline');

// Config
const DATA_URL = 'data/EC cancer dataset for australia 1.csv';
const COLORS = [
    '#0d9488', '#f43f5e', '#3b82f6', '#eab308', '#8b5cf6',
    '#f97316', '#06b6d4', '#ec4899', '#10b981', '#6366f1',
    '#d946ef', '#f59e0b', '#14b8a6', '#0ea5e9', '#84cc16',
    '#ef4444', '#064e3b', '#4338ca', '#be185d', '#a21caf',
    '#1e40af', '#15803d', '#b45309', '#7c3aed', '#db2777',
    '#0891b2', '#059669', '#78350f', '#4c1d95', '#9f1239'
];

const LIGHT_GRID = '#e2e8f0';
const LIGHT_TEXT = '#64748b';
const DARK_TEXT = '#0f172a'; // Darker for axes
const AXIS_FONT = { family: 'Inter, sans-serif', size: 12, color: DARK_TEXT, weight: 'bold' };

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        console.log('Parsing embedded data...');
        // embeddedCsvData is defined in data.js
        if (typeof embeddedCsvData === 'undefined') {
            throw new Error('Data file not loaded');
        }

        Papa.parse(embeddedCsvData.trim(), {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log('Data Parsed:', results.data.slice(0, 5));
                processData(results.data);
                initFilters();
                updateDashboard();

                // Dismiss loading overlay
                const overlay = document.getElementById('loadingOverlay');
                if (overlay) {
                    overlay.style.opacity = '0';
                    overlay.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => overlay.remove(), 500);
                }
            }
        });
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load dataset. Please ensure data.js is generated correctly.');
    }
}

function processData(data) {
    // Filter clean rows
    rawData = data.filter(row => row.Year && row['Cancer label']);

    // Sort by year
    rawData.sort((a, b) => a.Year - b.Year);
}

function initFilters() {
    // Extract unique cancer types
    const types = [...new Set(rawData.map(d => d['Cancer label']))].sort();

    state.selectedTypes = types; // Select all by default

    // Create Checkboxes
    types.forEach(type => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="type-${type}" value="${type}" checked>
            <label for="type-${type}">${type}</label>
        `;
        cancerTypeContainer.appendChild(div);

        // Listener
        div.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
                state.selectedTypes.push(type);
            } else {
                state.selectedTypes = state.selectedTypes.filter(t => t !== type);
            }
            updateDashboard();
        });
    });

    // Listeners for other controls
    // Listeners for other controls
    const searchInput = document.getElementById('cancerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = cancerTypeContainer.querySelectorAll('.checkbox-item');

            items.forEach(item => {
                const label = item.querySelector('label').innerText.toLowerCase();
                if (label.includes(term)) {
                    item.style.display = 'flex'; // Restore flex display
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    rangeMin.addEventListener('input', updateYearRange);
    rangeMax.addEventListener('input', updateYearRange);
    metricSelect.addEventListener('change', (e) => {
        state.metric = e.target.value;
        updateDashboard();
    });
    showTrendlineCheckbox.addEventListener('change', updateDashboard);

    selectAllBtn.addEventListener('click', () => toggleAllTypes(true));
    clearAllBtn.addEventListener('click', () => toggleAllTypes(false));
}

function toggleAllTypes(selectAll) {
    const checkboxes = cancerTypeContainer.querySelectorAll('input[type="checkbox"]');
    state.selectedTypes = [];
    checkboxes.forEach(cb => {
        cb.checked = selectAll;
        if (selectAll) state.selectedTypes.push(cb.value);
    });
    updateDashboard();
}

function updateYearRange() {
    let min = parseInt(rangeMin.value);
    let max = parseInt(rangeMax.value);

    // Prevent cross-over
    if (min > max - 1) {
        if (this === rangeMin) rangeMin.value = max - 1;
        else rangeMax.value = min + 1;
    }

    state.yearMin = parseInt(rangeMin.value);
    state.yearMax = parseInt(rangeMax.value);

    yearMinInput.innerText = state.yearMin;
    yearMaxInput.innerText = state.yearMax;

    updateDashboard();
}

function updateDashboard() {
    // 1. Filter Data
    filteredData = rawData.filter(d =>
        d.Year >= state.yearMin &&
        d.Year <= state.yearMax &&
        state.selectedTypes.includes(d['Cancer label'])
    );

    // 2. Compute KPIs
    updateKPIs();

    // 3. Render Charts
    renderCustomLegend();
    renderTrendChart();
    renderBarChart();
    renderPieChart();
    renderAreaChart();
    renderTreemap();
}

// ... (keep renderCustomLegend, updateKPIs, renderTrendChart, renderBarChart, renderPieChart, renderAreaChart as is)

function renderTreemap() {
    // 1. Aggregates for Treemap (2023 ONLY)
    // We strictly use data from Year 2023
    const targetYear = 2023;

    const labels = [];
    const parents = [];
    const values = []; // Size
    const colors = []; // Metric (Severity)
    const text = [];

    state.selectedTypes.forEach(type => {
        // Find the specific entry for 2023
        const entry = rawData.find(d => d.Year === targetYear && d['Cancer label'] === type);

        if (!entry) return;

        const totalCases = entry.Total || 0;
        const rate = entry[state.metric];

        labels.push(type);
        parents.push('All Cancers');
        values.push(totalCases);
        colors.push(rate);
        text.push(`Cases: ${totalCases.toLocaleString()}<br>Rate: ${rate.toFixed(2)}`);
    });

    // Add Root Node
    labels.push('All Cancers');
    parents.push('');
    values.push(0); // Root value is ignored/summed
    colors.push(0); // Neutral color
    text.push('');

    const data = [{
        type: 'treemap',
        labels: labels,
        parents: parents,
        values: values,
        marker: {
            colors: colors,
            colorscale: 'Reds', // White -> Red -> Dark Red
            reversescale: false, // Ensure Darkest (Red) is Highest Value
            showscale: true,
            colorbar: { title: `${state.metric} (2023)` }
        },
        text: text,
        textinfo: 'label+value',
        hoverinfo: 'label+text+value',
        tiling: { packaging: 'squarify' } // Nice square ratios
    }];

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, sans-serif', color: LIGHT_TEXT },
        margin: { t: 30, l: 20, r: 20, b: 30 }
    };

    Plotly.newPlot('treemapChart', data, layout, { responsive: true });
}

// ... (keep renderCustomLegend, updateKPIs, renderTrendChart, renderBarChart, renderPieChart, renderAreaChart as is)

function renderHeatmap() {
    // X-Axis: Years
    const years = [...new Set(filteredData.map(d => d.Year))].sort();

    // Y-Axis: Cancer Types (from selection)
    const types = state.selectedTypes;

    // Z-Data: Matrix of values [cancerTypeIndex][yearIndex]
    const z = [];

    types.forEach(type => {
        const row = [];
        const typeData = filteredData.filter(d => d['Cancer label'] === type);

        years.forEach(yr => {
            const entry = typeData.find(d => d.Year === yr);
            row.push(entry ? entry[state.metric] : 0);
        });
        z.push(row);
    });

    const data = [{
        x: years,
        y: types,
        z: z,
        type: 'heatmap',
        colorscale: 'Teal', // Medical theme
        showscale: true,
        hovertemplate: '<b>%{y}</b><br>Year: %{x}<br>Rate: %{z:.2f}<extra></extra>'
    }];

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: LIGHT_TEXT, family: 'Inter, sans-serif' },
        xaxis: {
            title: 'Year',
            gridcolor: LIGHT_GRID,
            tickmode: 'auto'
        },
        yaxis: {
            title: '', // Type names are self-explanatory
            automargin: true,
            gridcolor: LIGHT_GRID
        },
        margin: { t: 30, l: 150, r: 50, b: 50 } // Extra left margin for labels
    };

    Plotly.newPlot('heatmapChart', data, layout, { responsive: true });
}

function renderCustomLegend() {
    const container = document.getElementById('customLegend');
    container.innerHTML = '';

    state.selectedTypes.forEach((type, i) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background: ${COLORS[i % COLORS.length]}"></div>
            <span>${type}</span>
        `;
        container.appendChild(item);
    });
}

function updateKPIs() {
    if (filteredData.length === 0) return;

    // Avg Rate
    const totalRate = filteredData.reduce((sum, d) => sum + (d[state.metric] || 0), 0);
    const avg = totalRate / filteredData.length;
    document.getElementById('kpiAvgRate').innerText = avg.toFixed(2);

    // Highest Type
    // Group by type, avg rate
    const typeRates = {};
    filteredData.forEach(d => {
        if (!typeRates[d['Cancer label']]) typeRates[d['Cancer label']] = [];
        typeRates[d['Cancer label']].push(d[state.metric]);
    });

    let maxType = '';
    let maxVal = 0;
    for (const [type, rates] of Object.entries(typeRates)) {
        const typeAvg = rates.reduce((a, b) => a + b, 0) / rates.length;
        if (typeAvg > maxVal) {
            maxVal = typeAvg;
            maxType = type;
        }
    }

    document.getElementById('kpiHighestType').innerText = maxType;
    document.getElementById('kpiHighestValue').innerText = `${maxVal.toFixed(2)} (${state.metric})`;
}

function renderTrendChart() {
    const traces = [];

    // Group by Type
    state.selectedTypes.forEach((type, i) => {
        const typeData = filteredData.filter(d => d['Cancer label'] === type);
        // Sort by year just in case
        typeData.sort((a, b) => a.Year - b.Year);

        if (typeData.length === 0) return;

        const x = typeData.map(d => d.Year);
        const y = typeData.map(d => d[state.metric]);

        // Main Line
        traces.push({
            x: x,
            y: y,
            mode: 'lines', // Removed markers
            name: type,
            line: {
                color: COLORS[i % COLORS.length],
                width: 3, // Slightly thicker for better visibility
                shape: 'spline' // smooth/curved lines
            }
        });

        // Projection (Linear Regression)
        if (showTrendlineCheckbox.checked && typeData.length > 2) {
            const lr = linearRegression(x, y);
            // Project 5 years into future
            const futureX = [x[0], x[x.length - 1] + 5];
            const futureY = [lr.slope * x[0] + lr.intercept, lr.slope * (x[x.length - 1] + 5) + lr.intercept];

            traces.push({
                x: futureX,
                y: futureY,
                mode: 'lines',
                name: `${type} (Proj)`,
                line: {
                    color: COLORS[i % COLORS.length],
                    width: 1,
                    dash: 'dot'
                },
                showlegend: false,
                hoverinfo: 'none'
            });
        }
    });

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: LIGHT_TEXT },
        xaxis: {
            title: { text: 'Year', font: { size: 14, weight: 600 } },
            gridcolor: LIGHT_GRID,
            range: [state.yearMin, state.yearMax + (showTrendlineCheckbox.checked ? 5 : 0)],
            tickfont: AXIS_FONT
        },
        yaxis: {
            title: { text: state.metric, font: { size: 14, weight: 600 } },
            gridcolor: LIGHT_GRID,
            tickfont: AXIS_FONT
        },
        margin: { t: 20, l: 50, r: 20, b: 50 },
        showlegend: false // Legend moved to external container
    };

    Plotly.newPlot('trendChart', traces, layout, { responsive: true, displayModeBar: true });
}

function renderBarChart() {
    // Avg rate per type over select period
    const labels = [];
    const values = [];

    state.selectedTypes.forEach(type => {
        const typeData = filteredData.filter(d => d['Cancer label'] === type);
        if (typeData.length === 0) return;

        const avg = typeData.reduce((s, d) => s + d[state.metric], 0) / typeData.length;
        labels.push(type);
        values.push(avg);
    });

    // Sort descending
    const combined = labels.map((l, i) => ({ label: l, value: values[i] }));
    combined.sort((a, b) => b.value - a.value);

    // Take top 10 to avoid clutter if many selected
    const top10 = combined.slice(0, 15);

    const trace = {
        x: top10.map(d => d.label),
        y: top10.map(d => d.value),
        type: 'bar',
        marker: {
            color: top10.map((_, i) => COLORS[i % COLORS.length])
        }
    };

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: DARK_TEXT },
        xaxis: {
            tickangle: -45,
            tickfont: AXIS_FONT
        },
        yaxis: {
            title: { text: `Avg ${state.metric}`, font: { size: 14, weight: 600 } },
            tickfont: AXIS_FONT
        },
        margin: { t: 10, b: 80 }
    };

    Plotly.newPlot('barChart', [trace], layout, { responsive: true });
}

function renderPieChart() {
    // Total incidents (Metric sum)
    const labels = [];
    const values = [];

    state.selectedTypes.forEach(type => {
        const typeData = filteredData.filter(d => d['Cancer label'] === type);
        const sum = typeData.reduce((s, d) => s + (d[state.metric]), 0);
        labels.push(type);
        values.push(sum);
    });

    const trace = {
        labels: labels,
        values: values,
        type: 'pie',
        hole: 0.4, // Revert to Donut
        textinfo: 'label+percent',
        textposition: 'inside',
        insidetextorientation: 'radial', // Helps with legibility
        automargin: true,
        marker: { colors: COLORS },
        textfont: {
            family: 'Inter, sans-serif',
            size: 13, // Medium sized
            color: '#ffffff' // White and clear
        }
    };

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#f8fafc' },
        showlegend: false,
        margin: { t: 0, b: 0, l: 0, r: 0 }
    };

    Plotly.newPlot('pieChart', [trace], layout, { responsive: true });
}

function renderAreaChart() {
    const traces = [];
    const years = [...new Set(filteredData.map(d => d.Year))].sort();

    state.selectedTypes.forEach((type, i) => {
        const typeData = filteredData.filter(d => d['Cancer label'] === type);
        const y = years.map(yr => {
            const row = typeData.find(d => d.Year === yr);
            return row ? row[state.metric] : 0;
        });

        traces.push({
            x: years,
            y: y,
            stackgroup: 'one',
            name: type,
            fillcolor: COLORS[i % COLORS.length],
            line: { width: 0 }
        });
    });

    const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: DARK_TEXT },
        xaxis: {
            title: { text: 'Year', font: { size: 14, weight: 600 } },
            gridcolor: LIGHT_GRID,
            tickfont: AXIS_FONT
        },
        yaxis: {
            title: { text: `Stacked ${state.metric}`, font: { size: 14, weight: 600 } },
            gridcolor: LIGHT_GRID,
            tickfont: AXIS_FONT
        },
        margin: { t: 20, l: 50, r: 20, b: 50 },
        showlegend: false // Removed key as requested
    };

    Plotly.newPlot('areaChart', traces, layout, { responsive: true });
}

// Utils
function linearRegression(x, y) {
    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumXX += x[i] * x[i];
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

function toggleExpand(btn) {
    const card = btn.closest('.chart-card');
    const icon = btn.querySelector('i');

    // Check if already expanded
    const isExpanded = card.classList.contains('expanded');

    if (isExpanded) {
        // Minimize
        card.classList.remove('expanded');
        document.body.classList.remove('has-expanded-chart');
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
    } else {
        // Expand
        // Close any other open ones first
        document.querySelectorAll('.chart-card.expanded').forEach(c => {
            c.classList.remove('expanded');
            const otherBtn = c.querySelector('.expand-btn i');
            if (otherBtn) {
                otherBtn.classList.remove('fa-compress');
                otherBtn.classList.add('fa-expand');
            }
        });

        card.classList.add('expanded');
        document.body.classList.add('has-expanded-chart');
        icon.classList.remove('fa-expand');
        icon.classList.add('fa-compress');
    }

    // Trigger Resize for Plotly
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        const plotDiv = card.querySelector('.js-plotly-plot');
        if (plotDiv) Plotly.Plots.resize(plotDiv);

        // Generate Analysis if expanding
        if (!isExpanded) {
            const chartId = card.querySelector('.js-plotly-plot').id;
            generateAnalysis(chartId);
        }
    }, 50);
}

function generateAnalysis(chartId) {
    const container = document.getElementById(`analysis-${chartId}`);
    if (!container) return;

    let text = '';
    const topType = document.getElementById('kpiHighestType').innerText;
    const topVal = document.getElementById('kpiHighestValue').innerText;

    // Simple dynamic insights based on current state
    switch (chartId) {
        case 'trendChart':
            text = `
                <span class="analysis-title">Longitudinal Trend Analysis</span>
                The data indicates a longitudinal progression of mortality rates from <strong>${state.yearMin}</strong> to <strong>${state.yearMax}</strong>. 
                Current projections (dashed lines) suggest a continued trajectory for key cancer types. 
                Notably, <strong>${topType}</strong> demonstrates significant activity, peaking at <strong>${topVal}</strong>. 
                Linear regression models applied to this dataset estimate future burden stability or decline, depending on the specific cancer site.
            `;
            break;
        case 'barChart':
            text = `
                <span class="analysis-title">Comparative Cohort Analysis</span>
                This comparative study highlights the mean mortality rates across the selected period. 
                <strong>${topType}</strong> presents as the dominant contributor to mortality burden. 
                The disparity between high-ranking and low-ranking cancer types suggests distinct etiological factors or variations in treatment efficacy.
            `;
            break;
        case 'pieChart':
            text = `
                <span class="analysis-title">Proportional Distribution Metrics</span>
                The proportional distribution illustrates the relative specific mortality fraction of each cancer type. 
                Dominant segments indicate public health priorities. 
                <strong>${topType}</strong> constitutes a major portion of the total observed mortality, warranting targeted intervention strategies.
            `;
            break;
        case 'areaChart':
            text = `
                <span class="analysis-title">Cumulative Burden Assessment</span>
                The stacked area visualization demonstrates the aggregate accumulation of mortality cases over time. 
                The widening vertical amplitude corresponds to an increase in total absolute cases, driven by both population growth and specific rate changes. 
                This view is critical for resource allocation planning.
            `;
            break;
        case 'treemapChart':
            text = `
                <span class="analysis-title">2023 Cross-Sectional Severity Analysis</span>
                This treemap provides a snapshot of the year 2023. 
                <strong>Box Size</strong> correlates to absolute mortality volume (Total Deaths), while 
                <strong>Color Intensity</strong> (Red Scale) indicates the Age-Standardised Rate (Severity). 
                Visual inspection reveals that high-volume cancers are not always the most lethal per capita, and vice versa.
            `;
            break;
    }

    container.innerHTML = text;
}

function exportDashboard() {
    window.print();
}
