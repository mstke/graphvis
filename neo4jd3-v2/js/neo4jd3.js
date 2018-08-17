import * as d3 from 'd3';
import * as Util from './Util';

import { Container } from './Container';
import { InfoPanel } from './InfoPanel';
import { Colors } from './Colors';
import { initSimulation } from './Simulation';

export function Neo4jd3(_selector, _options) {
    let container, infoPanel, nodes, relationships, relationshipsCopy, simulation,
        options = {
            contextMenu: {},
            iconMap: {},
            icons: undefined,
            imageMap: {},
            images: undefined,
            minCollision: undefined,
            neo4jData: undefined,
            nodeRadius: 25,
            onNodeClick: undefined,
            onNodeDoubleClick: undefined,
            onNodeDragEnd: undefined,
            onNodeDragStart: undefined,
            onNodeMouseEnter: undefined,
            onNodeMouseLeave: undefined,
            onRelationshipDoubleClick: undefined,
            onViewsMouseLeaveHandler: undefined,
            onViewsClickHandler: undefined,
            onViewsMouseOverHandler: undefined,
            showIcons: undefined
        };

    function appendNode(node) {
        return node.enter()
            .append('g')
            .on('contextmenu', (d) => {
                // Create the container for the context menu
                d3.selectAll('.context-menu').data([1])
                    .enter()
                    .append('div')
                    .attr('class', 'context-menu');
                // Hide the context-menu if it goes out of focus 
                d3.select('body').on('click.context-menu', function () {
                    d3.select('.context-menu').style('display', 'none');
                });
                // Append data to the context menu
                d3.selectAll('.context-menu')
                    .html('')
                    .append('ul')
                    .selectAll('li')
                    .data(options.contextMenu)
                    .enter()
                    .append('li')
                    .on('contextmenu', () => {
                        d3.event.preventDefault();
                    })
                    .on('click', (item) => {
                        item.handler(d);
                        d3.select('.context-menu').style('display', 'none');
                    })
                    .append('i')
                    .attr('class', (d) => {
                        return d.icon;
                    })
                    .text((d) => {
                        return " " + d.text;
                    });
                // Show the context menu
                d3.select('.context-menu')
                    .style('left', (d3.event.pageX - 2) + 'px')
                    .style('top', (d3.event.pageY - 2) + 'px')
                    .style('display', 'block');
                d3.event.preventDefault();
            })
            .attr('id', (d) => {
                d.uuid = Util.guid();
                return d.uuid;
            })
            .attr('class', (d) => {
                let classes = 'node';
                if (image(d)) {
                    classes += ' node-image';
                }
                return classes;
            })
            .on('click', (d) => {
                if (typeof options.onNodeClick === 'function') {
                    options.onNodeClick(d);
                }
            })
            .on('dblclick', (d) => {

                if (typeof options.onNodeDoubleClick === 'function') {
                    options.onNodeDoubleClick(d);
                }
            })
            .on('mouseenter', (d) => {
                infoPanel.updateInfo(d);

                if (typeof options.onNodeMouseEnter === 'function') {
                    options.onNodeMouseEnter(d);
                }
            })
            .on('mouseleave', (d) => {
                if (typeof options.onNodeMouseLeave === 'function') {
                    options.onNodeMouseLeave(d);
                }
            })
            .call(d3.drag()
                .on('start', dragStarted)
                .on('drag', dragged)
                .on('end', dragEnded));
    }

    function appendNodeToGraph(node) {
        let nodeEnter = appendNode(node);

        appendRingToNode(nodeEnter);
        appendOutlineToNode(nodeEnter);
        appendTextToNode(nodeEnter);
        appendImageToNode(nodeEnter);
        appendIconToNode(nodeEnter);

        return nodeEnter;
    }

    function appendIconToNode(node) {
        return node.append('text')
            .attr('class', 'text icon')
            .attr('fill', '#ffffff')
            .attr('font-size', '25px')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .attr('y', parseInt(Math.round(options.nodeRadius * 0.32)) + 'px')
            .html((d) => {
                let _icon = options.iconMap[d.labels[0].toLowerCase()];
                return _icon ? '&#x' + _icon : '';
            });
    }

    function appendImageToNode(node) {
        return node.append('image')
            .attr('height', '24px')
            .attr('x', '5px')
            .attr('y', '5px')
            .attr('width', '24px');
    }

    function appendOutlineToNode(node) {
        return node.append('circle')
            .attr('class', 'outline')
            .attr('r', options.nodeRadius)
            .style('fill', (d) => {
                return Colors.class2color(d.labels[0]);
            })
            .style('stroke', (d) => {
                return Colors.class2darkenColor(d.labels[0]);
            })
            .append('title').text((d) => {
                return Util.toString(d);
            });
    }

    function appendRingToNode(node) {
        return node.append('circle')
            .attr('class', 'ring')
            .attr('r', options.nodeRadius * 1.16)
            .append('title').text((d) => {
                return Util.toString(d);
            });
    }

    function appendTextToNode(node) {
        let g = node.append('g');

        g.append('rect')
            .attr('width', '80px')
            .attr('height', '20px')
            .style('fill', '#bdc3c7')
            .attr('y', 28)
            .attr('x', -40)
            .attr('rx', 10)
            .attr('ry', 10);

        g.append('text')
            .text((node) => {
                return node.properties.name ? Util.truncateText(node.properties.name, 15) : node.id;
            })
            .attr('font-size', 10)
            .attr('x', 0)
            .attr('y', 37)
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central');
    }


    function appendRelationship(relationship) {
        return relationship.enter()
            .append('g')
            .attr('id', (d) => {
                d.uuid = Util.guid();
                return d.uuid;
            })
            .attr('class', 'relationship')
            .on('dblclick', (d) => {
                if (typeof options.onRelationshipDoubleClick === 'function') {
                    options.onRelationshipDoubleClick(d);
                }
            })
            .on('mouseenter', (d) => {
                infoPanel.updateInfo(d);
            });
    }

    function appendOutlineToRelationship(r) {
        return r.append('path')
            .attr('class', 'outline')
            .attr('fill', '#a5abb6')
            .attr('stroke', 'none');
    }

    function appendOverlayToRelationship(r) {
        return r.append('path')
            .attr('class', 'overlay');
    }

    function appendTextToRelationship(r) {
        return r.append('text')
            .attr('class', 'text')
            .attr('fill', '#000000')
            .attr('font-size', '8px')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .text((d) => {
                return d.type;
            });
    }

    function appendRelationshipToGraph(relationship) {
        let relationshipEnter = appendRelationship(relationship);
        let text = appendTextToRelationship(relationshipEnter);
        let overlay = appendOverlayToRelationship(relationshipEnter);

        appendOutlineToRelationship(relationshipEnter);
        return { overlay, rel: relationshipEnter, text };
    }

    function dragEnded(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0);
        }

        if (typeof options.onNodeDragEnd === 'function') {
            options.onNodeDragEnd(d);
        }
    }

    function dragged(d) {
        stickNode(d);
    }

    function dragStarted(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0.3).restart();
        }

        d.fx = d.x;
        d.fy = d.y;

        if (typeof options.onNodeDragStart === 'function') {
            options.onNodeDragStart(d);
        }
    }

    function image(d) {
        let i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;

        if (options.images) {
            imagesForLabel = options.imageMap[d.labels[0]];

            if (imagesForLabel) {
                imgLevel = 0;

                for (i = 0; i < imagesForLabel.length; i++) {
                    labelPropertyValue = imagesForLabel[i].split('|');

                    switch (labelPropertyValue.length) {
                        case 3:
                            value = labelPropertyValue[2];
                        /* falls through */
                        case 2:
                            property = labelPropertyValue[1];
                        /* falls through */
                        case 1:
                            label = labelPropertyValue[0];
                    }

                    if (d.labels[0] === label &&
                        (!property || d.properties[property] !== undefined) &&
                        (!value || d.properties[property] === value)) {
                        if (labelPropertyValue.length > imgLevel) {
                            img = options.images[imagesForLabel[i]];
                            imgLevel = labelPropertyValue.length;
                        }
                    }
                }
            }
        }

        return img;
    }

    function init(selector, _options) {

        Util.merge(options, _options);

        if (options.icons) {
            options.showIcons = true;
        }

        if (!options.minCollision) {
            options.minCollision = options.nodeRadius * 2;
        }

        container = new Container(selector);

        infoPanel = new InfoPanel(container.container);

        container.appendGraph();

        if (options.neo4jData) {
            loadNeo4jData(options.neo4jData);
        } else {
            console.error('Error: neo4jData is empty!');
        }

        relationshipsCopy = relationships.map(function (a) {
            return Object.assign({}, a);
        });
    }

    function loadNeo4jData() {
        nodes = [];
        relationships = [];
        updateWithNeo4jData(options.neo4jData);
    }

    function appendDataToNode(sourceNode, newNodes, newRelationships) {
        let data = {
            nodes: [],
            relationships: []
        },
            node,
            relationship;

        for (let i = 0; i < newNodes.length; i++) {
            node = {
                id: newNodes[i].id,
                labels: newNodes[i].labels,
                properties: newNodes[i].properties,
                x: sourceNode.x,
                y: sourceNode.y
            };
            data.nodes[data.nodes.length] = node;
        }

        for (let j = 0; j < newRelationships.length; j++) {
            relationship = {
                id: newRelationships[j].id,
                type: newRelationships[j].type,
                startNode: newRelationships[j].startNode,
                endNode: newRelationships[j].endNode,
                properties: newRelationships[j].properties,
                source: newRelationships[j].source,
                target: newRelationships[j].endNode,
            };
            data.relationships[data.relationships.length] = relationship;
        }
        updateWithD3Data(data);
    }

    function size() {
        return {
            nodes: nodes.length,
            relationships: relationships.length
        };
    }

    function stickNode(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function updateWithNeo4jData(neo4jData) {
        let d3Data = Util.neo4jDataToD3Data(neo4jData);

        relationshipsCopy = d3Data.relationships.map(function (a) {
            return Object.assign({}, a);
        });

        updateWithD3Data(d3Data);
    }

    function updateWithD3Data(d3Data) {
        updateNodesAndRelationships(d3Data.nodes, d3Data.relationships, true);
    }

    function updateNodesAndRelationships(n, r, append) {
        let relationshipObj = updateRelationships(r, append);
        let node = updateNodes(n, append);

        simulation = initSimulation(container.container, node, relationshipObj);

        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function updateNodes(n, append) {
        if (append) {
            Array.prototype.push.apply(nodes, n);
        }

        let node = container.svgNodes.selectAll('.node')
            .data(nodes, (d) => { return d.id; });
        let nodeEnter = appendNodeToGraph(node);

        node = nodeEnter.merge(node);
        return node;
    }

    function updateRelationships(r, append) {
        if (append) {
            Array.prototype.push.apply(relationships, r);
            r.forEach(function (rel) {
                if (!relationshipsCopy.find(function (relCopy) {
                    return rel.id === relCopy.id;
                })) {
                    relationshipsCopy.push(Object.assign({}, rel));
                }
            });
        }

        let relationship = container.svgRelationships.selectAll('.relationship')
            .data(relationships, (d) => { return d.id; });

        let { overlay, rel, text } = appendRelationshipToGraph(relationship);

        relationship = rel.merge(relationship);

        let relationshipOverlay = overlay.merge(container.svg.selectAll('.relationship .overlay'));
        let relationshipText = text.merge(container.svg.selectAll('.relationship .text'));

        return { relationship, relationshipOverlay, relationshipText };
    }

    function resetWithNeo4jData(neo4jData) {
        let newOptions = Object.assign(_options, { neo4jData: neo4jData });
        init(_selector, newOptions);
    }

    function removeNode(sourceNode) {
        relationships = relationships.filter(function (relationship) {
            if (relationship.source === sourceNode || relationship.target === sourceNode) {
                d3.select("#" + relationship.uuid).remove();
                return false;
            } else {
                return true;
            }
        });

        nodes = nodes.filter(function (node) {
            return node !== sourceNode;
        });

        d3.select("#" + sourceNode.uuid).remove();
        updateNodesAndRelationships(nodes, relationships, false);
    }

    init(_selector, _options);

    function highlightNodes(nodes) {
        nodes.forEach(function (node) {
            d3.select("#" + node.uuid)
                .classed('node-highlighted', true);
        });
    }

    function unHighlightNodes(nodes) {
        nodes.forEach(function (node) {
            d3.select("#" + node.uuid)
                .classed('node-highlighted', false);
        });
    }

    function orientForceGraphVertical(priorities) {
        nodes.sort(function (a, b) {
            return priorities[a.labels[0].toLowerCase()] - priorities[b.labels[0].toLowerCase()];
        });

        let priority = 0;
        let x = 700;
        let y = 200;

        nodes.forEach(function (node) {
            if (priorities[node.labels[0].toLowerCase()] !== priority) {
                priority = priorities[node.labels[0].toLowerCase()];
                y += 130;
                x = 700;
            }
            x += 150;

            node.fx = x;
            node.fy = y;
        });
    }

    function orientForceGraphHorizontal(priorities) {
        nodes.sort(function (a, b) {
            return priorities[a.labels[0].toLowerCase()] - priorities[b.labels[0].toLowerCase()];
        });

        let priority = 0;
        let x = 700;
        let y = 200;

        nodes.forEach(function (node) {
            if (priorities[node.labels[0].toLowerCase()] !== priority) {
                priority = priorities[node.labels[0].toLowerCase()];
                y = 200;
                x += 150;
            }
            y += 150;
            node.fx = x;
            node.fy = y;
        });
    }

    function getGraph() {
        return { 'nodes': nodes, 'relationships': relationships };
    }


    function expandNode(currentNode) {

        let data = {
            nodes: [],
            relationships: []
        };

        let s = size();

        currentNode.previous.forEach(function (n, i) {
            // Create new node

            let rand = + Math.floor((Math.random() * 200) - 75);
            let node = {
                id: n.node.id,
                labels: n.node.labels,
                properties: n.node.properties,
                x: currentNode.x + rand,
                y: currentNode.y + rand,
                fx: currentNode.fx + rand,
                fy: currentNode.fy + rand,
            };
            data.nodes[data.nodes.length] = node;

            // Create link from new node to its parent
            data.relationships[data.relationships.length] = {
                id: n.link.id,
                type: n.link.type,
                properties: n.link.properties,
                startNode: node.id,
                endNode: currentNode.id,
                source: node.id,
                target: currentNode.id,
                linknum: s.relationships + 1 + i
            };

            // Find original links 
            let links = relationshipsCopy.filter(function (link) {
                return link.endNode === node.id || link.startNode === node.id;
            });

            // Get links of the parent node
            let parentLinks = relationships.filter(function (link) {
                return link.source === currentNode || link.target === currentNode;
            });

            // Update the links to the newly created node
            links.forEach(function (link) {
                let parentLink = parentLinks.find(function (p) {
                    return p.id === link.id;
                });

                if (parentLink) {
                    if (link.startNode === node.id) {
                        parentLink.source = node;
                    } else {
                        parentLink.target = node;
                    }
                }
            });
        });

        currentNode.collapsed = false;
        currentNode.previous = [];

        updateWithD3Data(data);
    }


    function collapseNode(node, rules) {
        if (!rules[node.labels[0].toLowerCase()]) {
            return;
        }

        let links = relationships.filter(function (link) {
            return link.source === node || link.target === node;
        });

        let parentLink = links.find(function (link) {
            return rules.link.includes(link.type.toLowerCase()) && link.target.labels[0].toLowerCase() === rules[node.labels[0].toLowerCase()];
        });

        if (!parentLink) {
            return;
        }

        parentLink.target.collapsed = true;

        links.splice(links.indexOf(parentLink), 1);

        if (!parentLink.target.previous) {
            parentLink.target.previous = [];
        }

        parentLink.target.previous.push({
            node: node,
            link: parentLink
        });

        links.forEach(function (link) {
            link.collapsed = true;
            if (link.source === node) {
                link.source = parentLink.target;
                link.startNode = parentLink.endNode;
            } else {
                link.target = parentLink.target;
                link.endNode = parentLink.endNode;
            }
        });

        removeNode(node);
    }

    return {
        neo4jDataToD3Data: Util.neo4jDataToD3Data,
        size: size,
        updateWithD3Data: updateWithD3Data,
        updateWithNeo4jData: updateWithNeo4jData,
        appendDataToNode: appendDataToNode,
        resetWithNeo4jData: resetWithNeo4jData,
        removeNode: removeNode,
        createViews: Container.createViews,
        highlightNodes: highlightNodes,
        unHighlightNodes: unHighlightNodes,
        orientForceGraphVertical: orientForceGraphVertical,
        orientForceGraphHorizontal: orientForceGraphHorizontal,
        getGraph: getGraph,
        collapseNode: collapseNode,
        expandNode: expandNode,
    };
}

