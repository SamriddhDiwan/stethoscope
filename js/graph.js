// Graph variables
const arrayLength = 100;
let graphDataArray = new Array(arrayLength).fill(0);

function initGraph() {
    // Initialize Plotly graph
    Plotly.newPlot('graph', [{
        y: graphDataArray,
        mode: 'lines',
        line: { color: '#DF56F1' }
    }], {
        title: 'Audio Waveform',
        paper_bgcolor: "#f5f5f5",
        plot_bgcolor: "#f5f5f5",
        xaxis: { showticklabels: false },
        yaxis: { rangemode: "tozero" }
    });
}

function updateGraph(data) {
    // Update graph with new data
    graphDataArray = graphDataArray.concat(Array.from(data.slice(0, 100)));
    graphDataArray.splice(0, 100);
    
    Plotly.update('graph', {
        y: [graphDataArray]
    });
}