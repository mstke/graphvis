export function merge(target, source) {
    Object.keys(source).forEach(function (property) {
        target[property] = source[property];
    });
}

export function truncateText(str, length) {
    let ending = '...';

    if (length == null) {
        length = 100;
    }

    if (str.length > length) {
        return str.substring(0, length - ending.length) + ending;
    } else {
        return str;
    }
}

function contains(array, id) {
    let filter = array.filter(function (elem) {
        return elem.id === id;
    });

    return filter.length > 0;
}

export function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return 'g' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export function neo4jDataToD3Data(data) {
    let graph = {
        nodes: [],
        relationships: []
    };

    data.results.forEach((result) => {
        result.data.forEach((data) => {
            data.graph.nodes.forEach((node) => {
                if (!contains(graph.nodes, node.id)) {
                    graph.nodes.push(node);
                }
            });

            data.graph.relationships.forEach((relationship) => {
                if (!contains(graph.relationships, relationship.id)) {
                    relationship.source = relationship.startNode;
                    relationship.target = relationship.endNode;
                    graph.relationships.push(relationship);
                }
            });

            data.graph.relationships.sort((a, b) => {
                if (a.source > b.source) {
                    return 1;
                } else if (a.source < b.source) {
                    return -1;
                } else {
                    if (a.target > b.target) {
                        return 1;
                    }

                    if (a.target < b.target) {
                        return -1;
                    } else {
                        return 0;
                    }
                }
            });

            for (let i = 0; i < data.graph.relationships.length; i++) {
                if (i !== 0 && data.graph.relationships[i].source === data.graph.relationships[i - 1].source && data.graph.relationships[i].target === data.graph.relationships[i - 1].target) {
                    data.graph.relationships[i].linknum = data.graph.relationships[i - 1].linknum + 1;
                } else {
                    data.graph.relationships[i].linknum = 1;
                }
            }
        });
    });

    return graph;
}

export function toString(d) {
    var s = d.labels ? d.labels[0] : d.type;

    s += ' (<id>: ' + d.id;

    Object.keys(d.properties).forEach(function (property) {
        s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
    });

    s += ')';

    return s;
}