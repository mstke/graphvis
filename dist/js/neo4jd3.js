(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
    var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay, relationshipText, relationships, selector, simulation, svg, svgNodes, svgRelationships, svgScale, svgTranslate,
        classes2colors = {},
        justLoaded = false,
        numClasses = 0,
        options = {
            arrowSize: 4,
            colors: colors(),
            highlight: undefined,
            iconMap: fontAwesomeIcons(),
            icons: undefined,
            imageMap: {},
            images: undefined,
            infoPanel: true,
            minCollision: undefined,
            neo4jData: undefined,
            neo4jDataUrl: undefined,
            nodeOutlineFillColor: undefined,
            nodeRadius: 25,
            relationshipColor: '#a5abb6',
            zoomFit: false
        },
        VERSION = '0.0.1';

    function appendGraph(container) {
        svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('class', 'neo4jd3-graph')
            .call(d3.zoom().on('zoom', function () {
                var scale = d3.event.transform.k,
                    translate = [d3.event.transform.x, d3.event.transform.y];

                if (svgTranslate) {
                    translate[0] += svgTranslate[0];
                    translate[1] += svgTranslate[1];
                }

                if (svgScale) {
                    scale *= svgScale;
                }

                svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
            }))
            .on('dblclick.zoom', null)
            .append('g')
            .attr('width', '100%')
            .attr('height', '100%');

        svgRelationships = svg.append('g')
            .attr('class', 'relationships');

        svgNodes = svg.append('g')
            .attr('class', 'nodes');
    }

    function appendImageToNode(node) {
        return node.append('image')
            .attr('height', function (d) {
                return icon(d) ? '24px' : '30px';
            })
            .attr('x', function (d) {
                return icon(d) ? '5px' : '-15px';
            })
            .attr('xlink:href', function (d) {
                return image(d);
            })
            .attr('y', function (d) {
                return icon(d) ? '5px' : '-16px';
            })
            .attr('width', function (d) {
                return icon(d) ? '24px' : '30px';
            });
    }

    function appendInfoPanel(container) {
        return container.append('div')
            .attr('class', 'neo4jd3-info');
    }

    function appendInfoElement(cls, isNode, property, value) {
        var elem = info.append('a');

        elem.attr('href', '#')
            .attr('class', cls)
            .html('<strong>' + property + '</strong>' + (value ? (': ' + value) : ''));

        if (!value) {
            elem.style('background-color', function (d) {
                return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : (isNode ? class2color(property) : defaultColor());
            })
                .style('border-color', function (d) {
                    return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : (isNode ? class2darkenColor(property) : defaultDarkenColor());
                })
                .style('color', function (d) {
                    return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : '#fff';
                });
        }
    }

    function appendInfoElementClass(cls, node) {
        appendInfoElement(cls, true, node);
    }

    function appendInfoElementProperty(cls, property, value) {
        appendInfoElement(cls, false, property, value);
    }

    function appendInfoElementRelationship(cls, relationship) {
        appendInfoElement(cls, false, relationship);
    }

    function appendContextMenu(node, index) {
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
            .on('contextmenu', function (item) {
                d3.event.preventDefault();
            })
            .on('click', function (item) {
                item.handler(node);
                d3.select('.context-menu').style('display', 'none');
            })
            .append('i')
            .attr('class', function (d) {
                return d.icon;
            })
            .text(function (d) {
                return " " + d.text;
            });

        // Show the context menu
        d3.select('.context-menu')
            .style('left', (d3.event.pageX - 2) + 'px')
            .style('top', (d3.event.pageY - 2) + 'px')
            .style('display', 'block');
        d3.event.preventDefault();
    }

    function appendNode() {
        return node.enter()
            .append('g')
            .on('contextmenu', appendContextMenu)
            .attr('id', function(d) {
                d.uuid = guid();
                return d.uuid;
            })
            .attr('class', function (d) {
                var highlight, i,
                    classes = 'node',
                    label = d.labels[0];

                if (icon(d)) {
                    classes += ' node-icon';
                }

                if (image(d)) {
                    classes += ' node-image';
                }

                if (options.highlight) {
                    for (i = 0; i < options.highlight.length; i++) {
                        highlight = options.highlight[i];

                        if (d.labels[0] === highlight.class && d.properties[highlight.property] === highlight.value) {
                            classes += ' node-highlighted';
                            break;
                        }
                    }
                }

                return classes;
            })
            .on('click', function (d) {
                d.fx = d.fy = null;

                if (typeof options.onNodeClick === 'function') {
                    options.onNodeClick(d);
                }
            })
            .on('dblclick', function (d) {

                if (typeof options.onNodeDoubleClick === 'function') {
                    options.onNodeDoubleClick(d);
                }
            })
            .on('mouseenter', function (d) {
                if (info) {
                    updateInfo(d);
                }

                if (typeof options.onNodeMouseEnter === 'function') {
                    options.onNodeMouseEnter(d);
                }
            })
            .on('mouseleave', function (d) {

                if (typeof options.onNodeMouseLeave === 'function') {
                    options.onNodeMouseLeave(d);
                }
            })
            .call(d3.drag()
                .on('start', dragStarted)
                .on('drag', dragged)
                .on('end', dragEnded));
    }

    function appendNodeToGraph() {
        var n = appendNode();

        appendRingToNode(n);
        appendOutlineToNode(n);
        appendTextToNode(n);

        if (options.images) {
            appendImageToNode(n);
        }

        return n;
    }

    function appendOutlineToNode(node) {
        return node.append('circle')
            .attr('class', 'outline')
            .attr('r', options.nodeRadius)
            .style('fill', function (d) {
                return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : class2color(d.labels[0]);
            })
            .style('stroke', function (d) {
                return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : class2darkenColor(d.labels[0]);
            })
            .append('title').text(function (d) {
                return toString(d);
            });
    }

    function appendRingToNode(node) {
        return node.append('circle')
            .attr('class', 'ring')
            .attr('r', options.nodeRadius * 1.16)
            .append('title').text(function (d) {
                return toString(d);
            });
    }

    function appendTextToNode(node) {
        return node.append('text')
            .text(function (d) {
                return d.properties.name;
            })
            .attr('fill', '#000000')
            .attr('font-size', function (d) {
                return icon(d) ? (options.nodeRadius + 'px') : '10px';
            })
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .attr('y', function (d) {
                return icon(d) ? (parseInt(Math.round(options.nodeRadius * 0.32)) + 'px') : '4px';
            });
    }

    function appendRandomDataToNode(d, maxNodesToGenerate) {
        var data = randomD3Data(d, maxNodesToGenerate);
        updateWithNeo4jData(data);
    }

    function appendRelationship() {
        return relationship.enter()
            .append('g')
            .attr('id', function(d) {
                d.uuid = guid();
                return d.uuid;
            })
            .attr('class', 'relationship')
            .on('dblclick', function (d) {
                if (typeof options.onRelationshipDoubleClick === 'function') {
                    options.onRelationshipDoubleClick(d);
                }
            })
            .on('mouseenter', function (d) {
                if (info) {
                    updateInfo(d);
                }
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
            .text(function (d) {
                return d.type;
            });
    }

    function appendRelationshipToGraph() {
        var relationship = appendRelationship(),
            text = appendTextToRelationship(relationship),
            outline = appendOutlineToRelationship(relationship),
            overlay = appendOverlayToRelationship(relationship);

        return {
            outline: outline,
            overlay: overlay,
            relationship: relationship,
            text: text
        };
    }

    function class2color(cls) {
        var color = classes2colors[cls];

        if (!color) {
            //            color = options.colors[Math.min(numClasses, options.colors.length - 1)];
            color = options.colors[numClasses % options.colors.length];
            classes2colors[cls] = color;
            numClasses++;
        }

        return color;
    }

    function class2darkenColor(cls) {
        return d3.rgb(class2color(cls)).darker(1);
    }

    function clearInfo() {
        info.html('');
    }

    function colors() {
        // d3.schemeCategory10,
        // d3.schemeCategory20,
        return [
            '#68bdf6', // light blue
            '#6dce9e', // green #1
            '#faafc2', // light pink
            '#f2baf6', // purple
            '#ff928c', // light red
            '#fcea7e', // light yellow
            '#ffc766', // light orange
            '#405f9e', // navy blue
            '#a5abb6', // dark gray
            '#78cecb', // green #2,
            '#b88cbb', // dark purple
            '#ced2d9', // light gray
            '#e84646', // dark red
            '#fa5f86', // dark pink
            '#ffab1a', // dark orange
            '#fcda19', // dark yellow
            '#797b80', // black
            '#c9d96f', // pistacchio
            '#47991f', // green #3
            '#70edee', // turquoise
            '#ff75ea'  // pink
        ];
    }

    function contains(array, id) {
        var filter = array.filter(function (elem) {
            return elem.id === id;
        });

        return filter.length > 0;
    }

    function defaultColor() {
        return options.relationshipColor;
    }

    function defaultDarkenColor() {
        return d3.rgb(options.colors[options.colors.length - 1]).darker(1);
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

    function extend(obj1, obj2) {
        var obj = {};

        merge(obj, obj1);
        merge(obj, obj2);

        return obj;
    }

    function fontAwesomeIcons() {
        return { 'glass': 'f000', 'music': 'f001', 'search': 'f002', 'envelope-o': 'f003', 'heart': 'f004', 'star': 'f005', 'star-o': 'f006', 'user': 'f007', 'film': 'f008', 'th-large': 'f009', 'th': 'f00a', 'th-list': 'f00b', 'check': 'f00c', 'remove,close,times': 'f00d', 'search-plus': 'f00e', 'search-minus': 'f010', 'power-off': 'f011', 'signal': 'f012', 'gear,cog': 'f013', 'trash-o': 'f014', 'home': 'f015', 'file-o': 'f016', 'clock-o': 'f017', 'road': 'f018', 'download': 'f019', 'arrow-circle-o-down': 'f01a', 'arrow-circle-o-up': 'f01b', 'inbox': 'f01c', 'play-circle-o': 'f01d', 'rotate-right,repeat': 'f01e', 'refresh': 'f021', 'list-alt': 'f022', 'lock': 'f023', 'flag': 'f024', 'headphones': 'f025', 'volume-off': 'f026', 'volume-down': 'f027', 'volume-up': 'f028', 'qrcode': 'f029', 'barcode': 'f02a', 'tag': 'f02b', 'tags': 'f02c', 'book': 'f02d', 'bookmark': 'f02e', 'print': 'f02f', 'camera': 'f030', 'font': 'f031', 'bold': 'f032', 'italic': 'f033', 'text-height': 'f034', 'text-width': 'f035', 'align-left': 'f036', 'align-center': 'f037', 'align-right': 'f038', 'align-justify': 'f039', 'list': 'f03a', 'dedent,outdent': 'f03b', 'indent': 'f03c', 'video-camera': 'f03d', 'photo,image,picture-o': 'f03e', 'pencil': 'f040', 'map-marker': 'f041', 'adjust': 'f042', 'tint': 'f043', 'edit,pencil-square-o': 'f044', 'share-square-o': 'f045', 'check-square-o': 'f046', 'arrows': 'f047', 'step-backward': 'f048', 'fast-backward': 'f049', 'backward': 'f04a', 'play': 'f04b', 'pause': 'f04c', 'stop': 'f04d', 'forward': 'f04e', 'fast-forward': 'f050', 'step-forward': 'f051', 'eject': 'f052', 'chevron-left': 'f053', 'chevron-right': 'f054', 'plus-circle': 'f055', 'minus-circle': 'f056', 'times-circle': 'f057', 'check-circle': 'f058', 'question-circle': 'f059', 'info-circle': 'f05a', 'crosshairs': 'f05b', 'times-circle-o': 'f05c', 'check-circle-o': 'f05d', 'ban': 'f05e', 'arrow-left': 'f060', 'arrow-right': 'f061', 'arrow-up': 'f062', 'arrow-down': 'f063', 'mail-forward,share': 'f064', 'expand': 'f065', 'compress': 'f066', 'plus': 'f067', 'minus': 'f068', 'asterisk': 'f069', 'exclamation-circle': 'f06a', 'gift': 'f06b', 'leaf': 'f06c', 'fire': 'f06d', 'eye': 'f06e', 'eye-slash': 'f070', 'warning,exclamation-triangle': 'f071', 'plane': 'f072', 'calendar': 'f073', 'random': 'f074', 'comment': 'f075', 'magnet': 'f076', 'chevron-up': 'f077', 'chevron-down': 'f078', 'retweet': 'f079', 'shopping-cart': 'f07a', 'folder': 'f07b', 'folder-open': 'f07c', 'arrows-v': 'f07d', 'arrows-h': 'f07e', 'bar-chart-o,bar-chart': 'f080', 'twitter-square': 'f081', 'facebook-square': 'f082', 'camera-retro': 'f083', 'key': 'f084', 'gears,cogs': 'f085', 'comments': 'f086', 'thumbs-o-up': 'f087', 'thumbs-o-down': 'f088', 'star-half': 'f089', 'heart-o': 'f08a', 'sign-out': 'f08b', 'linkedin-square': 'f08c', 'thumb-tack': 'f08d', 'external-link': 'f08e', 'sign-in': 'f090', 'trophy': 'f091', 'github-square': 'f092', 'upload': 'f093', 'lemon-o': 'f094', 'phone': 'f095', 'square-o': 'f096', 'bookmark-o': 'f097', 'phone-square': 'f098', 'twitter': 'f099', 'facebook-f,facebook': 'f09a', 'github': 'f09b', 'unlock': 'f09c', 'credit-card': 'f09d', 'feed,rss': 'f09e', 'hdd-o': 'f0a0', 'bullhorn': 'f0a1', 'bell': 'f0f3', 'certificate': 'f0a3', 'hand-o-right': 'f0a4', 'hand-o-left': 'f0a5', 'hand-o-up': 'f0a6', 'hand-o-down': 'f0a7', 'arrow-circle-left': 'f0a8', 'arrow-circle-right': 'f0a9', 'arrow-circle-up': 'f0aa', 'arrow-circle-down': 'f0ab', 'globe': 'f0ac', 'wrench': 'f0ad', 'tasks': 'f0ae', 'filter': 'f0b0', 'briefcase': 'f0b1', 'arrows-alt': 'f0b2', 'group,users': 'f0c0', 'chain,link': 'f0c1', 'cloud': 'f0c2', 'flask': 'f0c3', 'cut,scissors': 'f0c4', 'copy,files-o': 'f0c5', 'paperclip': 'f0c6', 'save,floppy-o': 'f0c7', 'square': 'f0c8', 'navicon,reorder,bars': 'f0c9', 'list-ul': 'f0ca', 'list-ol': 'f0cb', 'strikethrough': 'f0cc', 'underline': 'f0cd', 'table': 'f0ce', 'magic': 'f0d0', 'truck': 'f0d1', 'pinterest': 'f0d2', 'pinterest-square': 'f0d3', 'google-plus-square': 'f0d4', 'google-plus': 'f0d5', 'money': 'f0d6', 'caret-down': 'f0d7', 'caret-up': 'f0d8', 'caret-left': 'f0d9', 'caret-right': 'f0da', 'columns': 'f0db', 'unsorted,sort': 'f0dc', 'sort-down,sort-desc': 'f0dd', 'sort-up,sort-asc': 'f0de', 'envelope': 'f0e0', 'linkedin': 'f0e1', 'rotate-left,undo': 'f0e2', 'legal,gavel': 'f0e3', 'dashboard,tachometer': 'f0e4', 'comment-o': 'f0e5', 'comments-o': 'f0e6', 'flash,bolt': 'f0e7', 'sitemap': 'f0e8', 'umbrella': 'f0e9', 'paste,clipboard': 'f0ea', 'lightbulb-o': 'f0eb', 'exchange': 'f0ec', 'cloud-download': 'f0ed', 'cloud-upload': 'f0ee', 'user-md': 'f0f0', 'stethoscope': 'f0f1', 'suitcase': 'f0f2', 'bell-o': 'f0a2', 'coffee': 'f0f4', 'cutlery': 'f0f5', 'file-text-o': 'f0f6', 'building-o': 'f0f7', 'hospital-o': 'f0f8', 'ambulance': 'f0f9', 'medkit': 'f0fa', 'fighter-jet': 'f0fb', 'beer': 'f0fc', 'h-square': 'f0fd', 'plus-square': 'f0fe', 'angle-double-left': 'f100', 'angle-double-right': 'f101', 'angle-double-up': 'f102', 'angle-double-down': 'f103', 'angle-left': 'f104', 'angle-right': 'f105', 'angle-up': 'f106', 'angle-down': 'f107', 'desktop': 'f108', 'laptop': 'f109', 'tablet': 'f10a', 'mobile-phone,mobile': 'f10b', 'circle-o': 'f10c', 'quote-left': 'f10d', 'quote-right': 'f10e', 'spinner': 'f110', 'circle': 'f111', 'mail-reply,reply': 'f112', 'github-alt': 'f113', 'folder-o': 'f114', 'folder-open-o': 'f115', 'smile-o': 'f118', 'frown-o': 'f119', 'meh-o': 'f11a', 'gamepad': 'f11b', 'keyboard-o': 'f11c', 'flag-o': 'f11d', 'flag-checkered': 'f11e', 'terminal': 'f120', 'code': 'f121', 'mail-reply-all,reply-all': 'f122', 'star-half-empty,star-half-full,star-half-o': 'f123', 'location-arrow': 'f124', 'crop': 'f125', 'code-fork': 'f126', 'unlink,chain-broken': 'f127', 'question': 'f128', 'info': 'f129', 'exclamation': 'f12a', 'superscript': 'f12b', 'subscript': 'f12c', 'eraser': 'f12d', 'puzzle-piece': 'f12e', 'microphone': 'f130', 'microphone-slash': 'f131', 'shield': 'f132', 'calendar-o': 'f133', 'fire-extinguisher': 'f134', 'rocket': 'f135', 'maxcdn': 'f136', 'chevron-circle-left': 'f137', 'chevron-circle-right': 'f138', 'chevron-circle-up': 'f139', 'chevron-circle-down': 'f13a', 'html5': 'f13b', 'css3': 'f13c', 'anchor': 'f13d', 'unlock-alt': 'f13e', 'bullseye': 'f140', 'ellipsis-h': 'f141', 'ellipsis-v': 'f142', 'rss-square': 'f143', 'play-circle': 'f144', 'ticket': 'f145', 'minus-square': 'f146', 'minus-square-o': 'f147', 'level-up': 'f148', 'level-down': 'f149', 'check-square': 'f14a', 'pencil-square': 'f14b', 'external-link-square': 'f14c', 'share-square': 'f14d', 'compass': 'f14e', 'toggle-down,caret-square-o-down': 'f150', 'toggle-up,caret-square-o-up': 'f151', 'toggle-right,caret-square-o-right': 'f152', 'euro,eur': 'f153', 'gbp': 'f154', 'dollar,usd': 'f155', 'rupee,inr': 'f156', 'cny,rmb,yen,jpy': 'f157', 'ruble,rouble,rub': 'f158', 'won,krw': 'f159', 'bitcoin,btc': 'f15a', 'file': 'f15b', 'file-text': 'f15c', 'sort-alpha-asc': 'f15d', 'sort-alpha-desc': 'f15e', 'sort-amount-asc': 'f160', 'sort-amount-desc': 'f161', 'sort-numeric-asc': 'f162', 'sort-numeric-desc': 'f163', 'thumbs-up': 'f164', 'thumbs-down': 'f165', 'youtube-square': 'f166', 'youtube': 'f167', 'xing': 'f168', 'xing-square': 'f169', 'youtube-play': 'f16a', 'dropbox': 'f16b', 'stack-overflow': 'f16c', 'instagram': 'f16d', 'flickr': 'f16e', 'adn': 'f170', 'bitbucket': 'f171', 'bitbucket-square': 'f172', 'tumblr': 'f173', 'tumblr-square': 'f174', 'long-arrow-down': 'f175', 'long-arrow-up': 'f176', 'long-arrow-left': 'f177', 'long-arrow-right': 'f178', 'apple': 'f179', 'windows': 'f17a', 'android': 'f17b', 'linux': 'f17c', 'dribbble': 'f17d', 'skype': 'f17e', 'foursquare': 'f180', 'trello': 'f181', 'female': 'f182', 'male': 'f183', 'gittip,gratipay': 'f184', 'sun-o': 'f185', 'moon-o': 'f186', 'archive': 'f187', 'bug': 'f188', 'vk': 'f189', 'weibo': 'f18a', 'renren': 'f18b', 'pagelines': 'f18c', 'stack-exchange': 'f18d', 'arrow-circle-o-right': 'f18e', 'arrow-circle-o-left': 'f190', 'toggle-left,caret-square-o-left': 'f191', 'dot-circle-o': 'f192', 'wheelchair': 'f193', 'vimeo-square': 'f194', 'turkish-lira,try': 'f195', 'plus-square-o': 'f196', 'space-shuttle': 'f197', 'slack': 'f198', 'envelope-square': 'f199', 'wordpress': 'f19a', 'openid': 'f19b', 'institution,bank,university': 'f19c', 'mortar-board,graduation-cap': 'f19d', 'yahoo': 'f19e', 'google': 'f1a0', 'reddit': 'f1a1', 'reddit-square': 'f1a2', 'stumbleupon-circle': 'f1a3', 'stumbleupon': 'f1a4', 'delicious': 'f1a5', 'digg': 'f1a6', 'pied-piper-pp': 'f1a7', 'pied-piper-alt': 'f1a8', 'drupal': 'f1a9', 'joomla': 'f1aa', 'language': 'f1ab', 'fax': 'f1ac', 'building': 'f1ad', 'child': 'f1ae', 'paw': 'f1b0', 'spoon': 'f1b1', 'cube': 'f1b2', 'cubes': 'f1b3', 'behance': 'f1b4', 'behance-square': 'f1b5', 'steam': 'f1b6', 'steam-square': 'f1b7', 'recycle': 'f1b8', 'automobile,car': 'f1b9', 'cab,taxi': 'f1ba', 'tree': 'f1bb', 'spotify': 'f1bc', 'deviantart': 'f1bd', 'soundcloud': 'f1be', 'database': 'f1c0', 'file-pdf-o': 'f1c1', 'file-word-o': 'f1c2', 'file-excel-o': 'f1c3', 'file-powerpoint-o': 'f1c4', 'file-photo-o,file-picture-o,file-image-o': 'f1c5', 'file-zip-o,file-archive-o': 'f1c6', 'file-sound-o,file-audio-o': 'f1c7', 'file-movie-o,file-video-o': 'f1c8', 'file-code-o': 'f1c9', 'vine': 'f1ca', 'codepen': 'f1cb', 'jsfiddle': 'f1cc', 'life-bouy,life-buoy,life-saver,support,life-ring': 'f1cd', 'circle-o-notch': 'f1ce', 'ra,resistance,rebel': 'f1d0', 'ge,empire': 'f1d1', 'git-square': 'f1d2', 'git': 'f1d3', 'y-combinator-square,yc-square,hacker-news': 'f1d4', 'tencent-weibo': 'f1d5', 'qq': 'f1d6', 'wechat,weixin': 'f1d7', 'send,paper-plane': 'f1d8', 'send-o,paper-plane-o': 'f1d9', 'history': 'f1da', 'circle-thin': 'f1db', 'header': 'f1dc', 'paragraph': 'f1dd', 'sliders': 'f1de', 'share-alt': 'f1e0', 'share-alt-square': 'f1e1', 'bomb': 'f1e2', 'soccer-ball-o,futbol-o': 'f1e3', 'tty': 'f1e4', 'binoculars': 'f1e5', 'plug': 'f1e6', 'slideshare': 'f1e7', 'twitch': 'f1e8', 'yelp': 'f1e9', 'newspaper-o': 'f1ea', 'wifi': 'f1eb', 'calculator': 'f1ec', 'paypal': 'f1ed', 'google-wallet': 'f1ee', 'cc-visa': 'f1f0', 'cc-mastercard': 'f1f1', 'cc-discover': 'f1f2', 'cc-amex': 'f1f3', 'cc-paypal': 'f1f4', 'cc-stripe': 'f1f5', 'bell-slash': 'f1f6', 'bell-slash-o': 'f1f7', 'trash': 'f1f8', 'copyright': 'f1f9', 'at': 'f1fa', 'eyedropper': 'f1fb', 'paint-brush': 'f1fc', 'birthday-cake': 'f1fd', 'area-chart': 'f1fe', 'pie-chart': 'f200', 'line-chart': 'f201', 'lastfm': 'f202', 'lastfm-square': 'f203', 'toggle-off': 'f204', 'toggle-on': 'f205', 'bicycle': 'f206', 'bus': 'f207', 'ioxhost': 'f208', 'angellist': 'f209', 'cc': 'f20a', 'shekel,sheqel,ils': 'f20b', 'meanpath': 'f20c', 'buysellads': 'f20d', 'connectdevelop': 'f20e', 'dashcube': 'f210', 'forumbee': 'f211', 'leanpub': 'f212', 'sellsy': 'f213', 'shirtsinbulk': 'f214', 'simplybuilt': 'f215', 'skyatlas': 'f216', 'cart-plus': 'f217', 'cart-arrow-down': 'f218', 'diamond': 'f219', 'ship': 'f21a', 'user-secret': 'f21b', 'motorcycle': 'f21c', 'street-view': 'f21d', 'heartbeat': 'f21e', 'venus': 'f221', 'mars': 'f222', 'mercury': 'f223', 'intersex,transgender': 'f224', 'transgender-alt': 'f225', 'venus-double': 'f226', 'mars-double': 'f227', 'venus-mars': 'f228', 'mars-stroke': 'f229', 'mars-stroke-v': 'f22a', 'mars-stroke-h': 'f22b', 'neuter': 'f22c', 'genderless': 'f22d', 'facebook-official': 'f230', 'pinterest-p': 'f231', 'whatsapp': 'f232', 'server': 'f233', 'user-plus': 'f234', 'user-times': 'f235', 'hotel,bed': 'f236', 'viacoin': 'f237', 'train': 'f238', 'subway': 'f239', 'medium': 'f23a', 'yc,y-combinator': 'f23b', 'optin-monster': 'f23c', 'opencart': 'f23d', 'expeditedssl': 'f23e', 'battery-4,battery-full': 'f240', 'battery-3,battery-three-quarters': 'f241', 'battery-2,battery-half': 'f242', 'battery-1,battery-quarter': 'f243', 'battery-0,battery-empty': 'f244', 'mouse-pointer': 'f245', 'i-cursor': 'f246', 'object-group': 'f247', 'object-ungroup': 'f248', 'sticky-note': 'f249', 'sticky-note-o': 'f24a', 'cc-jcb': 'f24b', 'cc-diners-club': 'f24c', 'clone': 'f24d', 'balance-scale': 'f24e', 'hourglass-o': 'f250', 'hourglass-1,hourglass-start': 'f251', 'hourglass-2,hourglass-half': 'f252', 'hourglass-3,hourglass-end': 'f253', 'hourglass': 'f254', 'hand-grab-o,hand-rock-o': 'f255', 'hand-stop-o,hand-paper-o': 'f256', 'hand-scissors-o': 'f257', 'hand-lizard-o': 'f258', 'hand-spock-o': 'f259', 'hand-pointer-o': 'f25a', 'hand-peace-o': 'f25b', 'trademark': 'f25c', 'registered': 'f25d', 'creative-commons': 'f25e', 'gg': 'f260', 'gg-circle': 'f261', 'tripadvisor': 'f262', 'odnoklassniki': 'f263', 'odnoklassniki-square': 'f264', 'get-pocket': 'f265', 'wikipedia-w': 'f266', 'safari': 'f267', 'chrome': 'f268', 'firefox': 'f269', 'opera': 'f26a', 'internet-explorer': 'f26b', 'tv,television': 'f26c', 'contao': 'f26d', '500px': 'f26e', 'amazon': 'f270', 'calendar-plus-o': 'f271', 'calendar-minus-o': 'f272', 'calendar-times-o': 'f273', 'calendar-check-o': 'f274', 'industry': 'f275', 'map-pin': 'f276', 'map-signs': 'f277', 'map-o': 'f278', 'map': 'f279', 'commenting': 'f27a', 'commenting-o': 'f27b', 'houzz': 'f27c', 'vimeo': 'f27d', 'black-tie': 'f27e', 'fonticons': 'f280', 'reddit-alien': 'f281', 'edge': 'f282', 'credit-card-alt': 'f283', 'codiepie': 'f284', 'modx': 'f285', 'fort-awesome': 'f286', 'usb': 'f287', 'product-hunt': 'f288', 'mixcloud': 'f289', 'scribd': 'f28a', 'pause-circle': 'f28b', 'pause-circle-o': 'f28c', 'stop-circle': 'f28d', 'stop-circle-o': 'f28e', 'shopping-bag': 'f290', 'shopping-basket': 'f291', 'hashtag': 'f292', 'bluetooth': 'f293', 'bluetooth-b': 'f294', 'percent': 'f295', 'gitlab': 'f296', 'wpbeginner': 'f297', 'wpforms': 'f298', 'envira': 'f299', 'universal-access': 'f29a', 'wheelchair-alt': 'f29b', 'question-circle-o': 'f29c', 'blind': 'f29d', 'audio-description': 'f29e', 'volume-control-phone': 'f2a0', 'braille': 'f2a1', 'assistive-listening-systems': 'f2a2', 'asl-interpreting,american-sign-language-interpreting': 'f2a3', 'deafness,hard-of-hearing,deaf': 'f2a4', 'glide': 'f2a5', 'glide-g': 'f2a6', 'signing,sign-language': 'f2a7', 'low-vision': 'f2a8', 'viadeo': 'f2a9', 'viadeo-square': 'f2aa', 'snapchat': 'f2ab', 'snapchat-ghost': 'f2ac', 'snapchat-square': 'f2ad', 'pied-piper': 'f2ae', 'first-order': 'f2b0', 'yoast': 'f2b1', 'themeisle': 'f2b2', 'google-plus-circle,google-plus-official': 'f2b3', 'fa,font-awesome': 'f2b4' };
    }

    function icon(d) {
        var code;

        if (options.iconMap && options.showIcons && options.icons) {
            if (options.icons[d.labels[0]] && options.iconMap[options.icons[d.labels[0]]]) {
                code = options.iconMap[options.icons[d.labels[0]]];
            } else if (options.iconMap[d.labels[0]]) {
                code = options.iconMap[d.labels[0]];
            } else if (options.icons[d.labels[0]]) {
                code = options.icons[d.labels[0]];
            }
        }

        return code;
    }

    function image(d) {
        var i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;

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

    function init(_selector, _options) {
        initIconMap();

        merge(options, _options);

        if (options.icons) {
            options.showIcons = true;
        }

        if (!options.minCollision) {
            options.minCollision = options.nodeRadius * 2;
        }

        initImageMap();

        selector = _selector;

        container = d3.select(selector);

        container.attr('class', 'neo4jd3')
            .html('');

        if (options.infoPanel) {
            info = appendInfoPanel(container);
        }

        appendGraph(container);

        simulation = initSimulation();

        if (options.neo4jData) {
            loadNeo4jData(options.neo4jData);
        } else if (options.neo4jDataUrl) {
            loadNeo4jDataFromUrl(options.neo4jDataUrl);
        } else {
            console.error('Error: both neo4jData and neo4jDataUrl are empty!');
        }
    }

    function initIconMap() {
        Object.keys(options.iconMap).forEach(function (key, index) {
            var keys = key.split(','),
                value = options.iconMap[key];

            keys.forEach(function (key) {
                options.iconMap[key] = value;
            });
        });
    }

    function initImageMap() {
        var key, keys, selector;

        for (key in options.images) {
            if (options.images.hasOwnProperty(key)) {
                keys = key.split('|');

                if (!options.imageMap[keys[0]]) {
                    options.imageMap[keys[0]] = [key];
                } else {
                    options.imageMap[keys[0]].push(key);
                }
            }
        }
    }

    function initSimulation() {
        var simulation = d3.forceSimulation()
            .force('collide', d3.forceCollide().radius(function (d) {
                return options.minCollision;
            }))
            .force('charge', d3.forceManyBody())
            .force('link', d3.forceLink().id(function (d) {
                return d.id;
            }))
            .force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2, svg.node().parentElement.parentElement.clientHeight / 2))
            .on('tick', function () {
                tick();
            })
            .on('end', function () {
                if (options.zoomFit && !justLoaded) {
                    justLoaded = true;
                    zoomFit(2);
                }
            });

        return simulation;
    }

    function loadNeo4jData() {
        nodes = [];
        relationships = [];

        updateWithNeo4jData(options.neo4jData);
    }

    function loadNeo4jDataFromUrl(neo4jDataUrl) {
        nodes = [];
        relationships = [];

        d3.json(neo4jDataUrl, function (error, data) {
            if (error) {
                throw error;
            }

            updateWithNeo4jData(data);
        });
    }

    function merge(target, source) {
        Object.keys(source).forEach(function (property) {
            target[property] = source[property];
        });
    }

    function neo4jDataToD3Data(data) {
        var graph = {
            nodes: [],
            relationships: []
        };

        data.results.forEach(function (result) {
            result.data.forEach(function (data) {
                data.graph.nodes.forEach(function (node) {
                    if (!contains(graph.nodes, node.id)) {
                        graph.nodes.push(node);
                    }
                });

                data.graph.relationships.forEach(function (relationship) {
                    if (!contains(graph.relationships, relationship.id)) {
                        relationship.source = relationship.startNode;
                        relationship.target = relationship.endNode;
                        graph.relationships.push(relationship);
                    }
                });

                data.graph.relationships.sort(function (a, b) {
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

                for (var i = 0; i < data.graph.relationships.length; i++) {
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
    
    function appendDataToNodeOutward(sourceNode, newNodes, newRelationships) {
        var data = {
            nodes: [],
            relationships: []
        },
            node,
            relationship,
            s = size(),
            map = {};
        for (var i = 0; i < newNodes.length; i++) {
            node = {
                id: s.nodes + 1 + i,
                labels: newNodes[i].labels,
                properties: newNodes[i].properties,
                x: sourceNode.x,
                y: sourceNode.y
            };
            map[newNodes[i].id] = node.id;
            data.nodes[data.nodes.length] = node;
        }

        for (var j = 0; j < newRelationships.length; j++) {

            relationship = {
                id: s.relationships + 1 + j,
                type: newRelationships[j].type,
                startNode: sourceNode.id.toString(),
                endNode: map[newRelationships[j].endNode],
                properties: newRelationships[j].properties,
                source: sourceNode.id,
                target: map[newRelationships[j].endNode],
                linknum: s.relationships + 1 + j
            };

            data.relationships[data.relationships.length] = relationship;
        }
        updateWithD3Data(data);
    }

    
    function appendDataToNodeInward(sourceNode, newNodes, newRelationships) {
        var data = {
            nodes: [],
            relationships: []
        },
            node,
            relationship,
            s = size(),
            map = {};
        for (var i = 0; i < newNodes.length; i++) {
            node = {
                id: s.nodes + 1 + i,
                labels: newNodes[i].labels,
                properties: newNodes[i].properties,
                x: sourceNode.x,
                y: sourceNode.y
            };
            map[newNodes[i].id] = node.id;
            data.nodes[data.nodes.length] = node;
        }
        for (var j = 0; j < newRelationships.length; j++) {
            relationship = {
                id: s.relationships + 1 + j,
                type: newRelationships[j].type,
                startNode: map[newRelationships[j].startNode],
                endNode: sourceNode.id.toString(),
                properties: newRelationships[j].properties,
                source: map[newRelationships[j].startNode],
                target: sourceNode.id,
                linknum: s.relationships + 1 + j
            };

            data.relationships[data.relationships.length] = relationship;
        }
        updateWithD3Data(data);
    }

    function randomD3Data(d, maxNodesToGenerate) {
        var data = {
            nodes: [],
            relationships: []
        },
            i,
            label,
            node,
            numNodes = (maxNodesToGenerate * Math.random() << 0) + 1,
            relationship,
            s = size();
        for (i = 0; i < numNodes; i++) {
            label = randomLabel();

            node = {
                id: s.nodes + 1 + i,
                labels: [label],
                properties: {
                    random: label
                },
                x: d.x,
                y: d.y
            };

            data.nodes[data.nodes.length] = node;

            relationship = {
                id: s.relationships + 1 + i,
                type: label.toUpperCase(),
                startNode: d.id,
                endNode: s.nodes + 1 + i,
                properties: {
                    from: Date.now()
                },
                source: d.id,
                target: s.nodes + 1 + i,
                linknum: s.relationships + 1 + i
            };
            data.relationships[data.relationships.length] = relationship;
        }
        return data;
    }

    function randomLabel() {
        var icons = Object.keys(options.iconMap);
        return icons[icons.length * Math.random() << 0];
    }

    function rotate(cx, cy, x, y, angle) {
        var radians = (Math.PI / 180) * angle,
            cos = Math.cos(radians),
            sin = Math.sin(radians),
            nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
            ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;

        return { x: nx, y: ny };
    }

    function rotatePoint(c, p, angle) {
        return rotate(c.x, c.y, p.x, p.y, angle);
    }

    function rotation(source, target) {
        return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
    }

    function size() {
        return {
            nodes: nodes.length,
            relationships: relationships.length
        };
    }
    /*
        function smoothTransform(elem, translate, scale) {
            var animationMilliseconds = 5000,
                timeoutMilliseconds = 50,
                steps = parseInt(animationMilliseconds / timeoutMilliseconds);
    
            setTimeout(function() {
                smoothTransformStep(elem, translate, scale, timeoutMilliseconds, 1, steps);
            }, timeoutMilliseconds);
        }
    
        function smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step, steps) {
            var progress = step / steps;
    
            elem.attr('transform', 'translate(' + (translate[0] * progress) + ', ' + (translate[1] * progress) + ') scale(' + (scale * progress) + ')');
    
            if (step < steps) {
                setTimeout(function() {
                    smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step + 1, steps);
                }, timeoutMilliseconds);
            }
        }
    */
    function stickNode(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function tick() {
        tickNodes();
        tickRelationships();
    }

    function tickNodes() {
        if (node) {
            node.attr('transform', function (d) {
                return 'translate(' + d.x + ', ' + d.y + ')';
            });
        }
    }

    function tickRelationships() {
        if (relationship) {
            relationship.attr('transform', function (d) {
                var angle = rotation(d.source, d.target);
                return 'translate(' + d.source.x + ', ' + d.source.y + ') rotate(' + angle + ')';
            });

            tickRelationshipsTexts();
            tickRelationshipsOutlines();
            tickRelationshipsOverlays();
        }
    }

    function tickRelationshipsOutlines() {
        relationship.each(function () {
            var rel = d3.select(this),
                outline = rel.select('.outline'),
                text = rel.select('.text');

            outline.attr('d', function (d) {
                var center = { x: 0, y: 0 },
                    angle = rotation(d.source, d.target),
                    textBoundingBox = text.node().getBBox(),
                    textPadding = 5,
                    u = unitaryVector(d.source, d.target),
                    textMargin = { x: (d.target.x - d.source.x - (textBoundingBox.width + textPadding) * u.x) * 0.5, y: (d.target.y - d.source.y - (textBoundingBox.width + textPadding) * u.y) * 0.5 },
                    n = unitaryNormalVector(d.source, d.target),
                    rotatedPointA1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x - n.x, y: 0 + (options.nodeRadius + 1) * u.y - n.y }, angle),
                    rotatedPointB1 = rotatePoint(center, { x: textMargin.x - n.x, y: textMargin.y - n.y }, angle),
                    rotatedPointC1 = rotatePoint(center, { x: textMargin.x, y: textMargin.y }, angle),
                    rotatedPointD1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x, y: 0 + (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointA2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x - n.x, y: d.target.y - d.source.y - textMargin.y - n.y }, angle),
                    rotatedPointB2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y - u.y * options.arrowSize }, angle),
                    rotatedPointC2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x + (n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y + (n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointD2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointE2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x + (- n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y + (- n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointF2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - u.y * options.arrowSize }, angle),
                    rotatedPointG2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x, y: d.target.y - d.source.y - textMargin.y }, angle);

                return 'M ' + rotatedPointA1.x + ' ' + rotatedPointA1.y +
                    ' L ' + rotatedPointB1.x + ' ' + rotatedPointB1.y +
                    ' L ' + rotatedPointC1.x + ' ' + rotatedPointC1.y +
                    ' L ' + rotatedPointD1.x + ' ' + rotatedPointD1.y +
                    ' Z M ' + rotatedPointA2.x + ' ' + rotatedPointA2.y +
                    ' L ' + rotatedPointB2.x + ' ' + rotatedPointB2.y +
                    ' L ' + rotatedPointC2.x + ' ' + rotatedPointC2.y +
                    ' L ' + rotatedPointD2.x + ' ' + rotatedPointD2.y +
                    ' L ' + rotatedPointE2.x + ' ' + rotatedPointE2.y +
                    ' L ' + rotatedPointF2.x + ' ' + rotatedPointF2.y +
                    ' L ' + rotatedPointG2.x + ' ' + rotatedPointG2.y +
                    ' Z';
            });
        });
    }

    function tickRelationshipsOverlays() {
        relationshipOverlay.attr('d', function (d) {
            var center = { x: 0, y: 0 },
                angle = rotation(d.source, d.target),
                n1 = unitaryNormalVector(d.source, d.target),
                n = unitaryNormalVector(d.source, d.target, 50),
                rotatedPointA = rotatePoint(center, { x: 0 - n.x, y: 0 - n.y }, angle),
                rotatedPointB = rotatePoint(center, { x: d.target.x - d.source.x - n.x, y: d.target.y - d.source.y - n.y }, angle),
                rotatedPointC = rotatePoint(center, { x: d.target.x - d.source.x + n.x - n1.x, y: d.target.y - d.source.y + n.y - n1.y }, angle),
                rotatedPointD = rotatePoint(center, { x: 0 + n.x - n1.x, y: 0 + n.y - n1.y }, angle);

            return 'M ' + rotatedPointA.x + ' ' + rotatedPointA.y +
                ' L ' + rotatedPointB.x + ' ' + rotatedPointB.y +
                ' L ' + rotatedPointC.x + ' ' + rotatedPointC.y +
                ' L ' + rotatedPointD.x + ' ' + rotatedPointD.y +
                ' Z';
        });
    }

    function tickRelationshipsTexts() {
        relationshipText.attr('transform', function (d) {
            var angle = (rotation(d.source, d.target) + 360) % 360,
                mirror = angle > 90 && angle < 270,
                center = { x: 0, y: 0 },
                n = unitaryNormalVector(d.source, d.target),
                nWeight = mirror ? 2 : -3,
                point = { x: (d.target.x - d.source.x) * 0.5 + n.x * nWeight, y: (d.target.y - d.source.y) * 0.5 + n.y * nWeight },
                rotatedPoint = rotatePoint(center, point, angle);

            return 'translate(' + rotatedPoint.x + ', ' + rotatedPoint.y + ') rotate(' + (mirror ? 180 : 0) + ')';
        });
    }

    function toString(d) {
        var s = d.labels ? d.labels[0] : d.type;

        s += ' (<id>: ' + d.id;

        Object.keys(d.properties).forEach(function (property) {
            s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
        });

        s += ')';

        return s;
    }

    function unitaryNormalVector(source, target, newLength) {
        var center = { x: 0, y: 0 },
            vector = unitaryVector(source, target, newLength);

        return rotatePoint(center, vector, 90);
    }

    function unitaryVector(source, target, newLength) {
        var length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1);

        return {
            x: (target.x - source.x) / length,
            y: (target.y - source.y) / length,
        };
    }

    function updateWithD3Data(d3Data) {
        updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
    }

    function updateWithNeo4jData(neo4jData) {
        var d3Data = neo4jDataToD3Data(neo4jData);
        updateWithD3Data(d3Data);
    }

    function updateInfo(d) {
        clearInfo();

        if (d.labels) {
            appendInfoElementClass('class', d.labels[0]);
        } else {
            appendInfoElementRelationship('class', d.type);
        }

        appendInfoElementProperty('property', '&lt;id&gt;', d.id);

        Object.keys(d.properties).forEach(function (property) {
            appendInfoElementProperty('property', property, JSON.stringify(d.properties[property]));
        });
    }

    function updateNodes(n) {
        Array.prototype.push.apply(nodes, n);

        node = svgNodes.selectAll('.node')
            .data(nodes, function (d) { return d.id; });
        var nodeEnter = appendNodeToGraph();
        node = nodeEnter.merge(node);
    }

    function updateNodesAndRelationships(n, r) {
        updateRelationships(r);
        updateNodes(n);

        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function updateRelationships(r) {
        Array.prototype.push.apply(relationships, r);

        relationship = svgRelationships.selectAll('.relationship')
            .data(relationships, function (d) { return d.id; });

        var relationshipEnter = appendRelationshipToGraph();

        relationship = relationshipEnter.relationship.merge(relationship);

        relationshipOutline = svg.selectAll('.relationship .outline');
        relationshipOutline = relationshipEnter.outline.merge(relationshipOutline);

        relationshipOverlay = svg.selectAll('.relationship .overlay');
        relationshipOverlay = relationshipEnter.overlay.merge(relationshipOverlay);

        relationshipText = svg.selectAll('.relationship .text');
        relationshipText = relationshipEnter.text.merge(relationshipText);
    }

    function version() {
        return VERSION;
    }

    function zoomFit(transitionDuration) {
        var bounds = svg.node().getBBox(),
            parent = svg.node().parentElement.parentElement,
            fullWidth = parent.clientWidth,
            fullHeight = parent.clientHeight,
            width = bounds.width,
            height = bounds.height,
            midX = bounds.x + width / 2,
            midY = bounds.y + height / 2;

        if (width === 0 || height === 0) {
            return; // nothing to fit
        }

        svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
        svgTranslate = [fullWidth / 2 - svgScale * midX, fullHeight / 2 - svgScale * midY];

        svg.attr('transform', 'translate(' + svgTranslate[0] + ', ' + svgTranslate[1] + ') scale(' + svgScale + ')');
        //        smoothTransform(svgTranslate, svgScale);
    }

    function resetWithNeo4jData(neo4jData) {
        var newOptions = Object.assign(_options, { neo4jData: neo4jData, neo4jDataUrl: undefined });
        init(_selector, newOptions);
    }

    function removeNode(sourceNode) {
        relationships = relationships.filter(function(relationship) {
            if(relationship.source === sourceNode || relationship.target === sourceNode) {
                d3.select("#" + relationship.uuid).remove();
                return false;
            } else {
                return true;
            }
        });
        nodes = nodes.filter(function(node) {
            return node !== sourceNode;
        });

        d3.select("#" + sourceNode.uuid).remove();
        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function guid() {
        function s4() {
          return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return 'g' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
      }

    init(_selector, _options);

    return {
        appendRandomDataToNode: appendRandomDataToNode,
        neo4jDataToD3Data: neo4jDataToD3Data,
        randomD3Data: randomD3Data,
        size: size,
        updateWithD3Data: updateWithD3Data,
        updateWithNeo4jData: updateWithNeo4jData,
        appendDataToNodeOutward: appendDataToNodeOutward,
        appendDataToNodeInward: appendDataToNodeInward,
        resetWithNeo4jData: resetWithNeo4jData,
        removeNode: removeNode,
        version: version
    };
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5lbzRqZDMgPSByZXF1aXJlKCcuL3NjcmlwdHMvbmVvNGpkMycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5lbzRqZDM7XG4iLCIvKiBnbG9iYWwgZDMsIGRvY3VtZW50ICovXHJcbi8qIGpzaGludCBsYXRlZGVmOm5vZnVuYyAqL1xyXG4ndXNlIHN0cmljdCc7XHJcblxyXG5mdW5jdGlvbiBOZW80akQzKF9zZWxlY3RvciwgX29wdGlvbnMpIHtcclxuICAgIHZhciBjb250YWluZXIsIGdyYXBoLCBpbmZvLCBub2RlLCBub2RlcywgcmVsYXRpb25zaGlwLCByZWxhdGlvbnNoaXBPdXRsaW5lLCByZWxhdGlvbnNoaXBPdmVybGF5LCByZWxhdGlvbnNoaXBUZXh0LCByZWxhdGlvbnNoaXBzLCBzZWxlY3Rvciwgc2ltdWxhdGlvbiwgc3ZnLCBzdmdOb2Rlcywgc3ZnUmVsYXRpb25zaGlwcywgc3ZnU2NhbGUsIHN2Z1RyYW5zbGF0ZSxcclxuICAgICAgICBjbGFzc2VzMmNvbG9ycyA9IHt9LFxyXG4gICAgICAgIGp1c3RMb2FkZWQgPSBmYWxzZSxcclxuICAgICAgICBudW1DbGFzc2VzID0gMCxcclxuICAgICAgICBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICBhcnJvd1NpemU6IDQsXHJcbiAgICAgICAgICAgIGNvbG9yczogY29sb3JzKCksXHJcbiAgICAgICAgICAgIGhpZ2hsaWdodDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpY29uTWFwOiBmb250QXdlc29tZUljb25zKCksXHJcbiAgICAgICAgICAgIGljb25zOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGltYWdlTWFwOiB7fSxcclxuICAgICAgICAgICAgaW1hZ2VzOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGluZm9QYW5lbDogdHJ1ZSxcclxuICAgICAgICAgICAgbWluQ29sbGlzaW9uOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5lbzRqRGF0YTogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBuZW80akRhdGFVcmw6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbm9kZU91dGxpbmVGaWxsQ29sb3I6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbm9kZVJhZGl1czogMjUsXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcENvbG9yOiAnI2E1YWJiNicsXHJcbiAgICAgICAgICAgIHpvb21GaXQ6IGZhbHNlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBWRVJTSU9OID0gJzAuMC4xJztcclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRHcmFwaChjb250YWluZXIpIHtcclxuICAgICAgICBzdmcgPSBjb250YWluZXIuYXBwZW5kKCdzdmcnKVxyXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAnMTAwJScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICduZW80amQzLWdyYXBoJylcclxuICAgICAgICAgICAgLmNhbGwoZDMuem9vbSgpLm9uKCd6b29tJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjYWxlID0gZDMuZXZlbnQudHJhbnNmb3JtLmssXHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlID0gW2QzLmV2ZW50LnRyYW5zZm9ybS54LCBkMy5ldmVudC50cmFuc2Zvcm0ueV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN2Z1RyYW5zbGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZVswXSArPSBzdmdUcmFuc2xhdGVbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlWzFdICs9IHN2Z1RyYW5zbGF0ZVsxXTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3ZnU2NhbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzY2FsZSAqPSBzdmdTY2FsZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzdmcuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdHJhbnNsYXRlWzBdICsgJywgJyArIHRyYW5zbGF0ZVsxXSArICcpIHNjYWxlKCcgKyBzY2FsZSArICcpJyk7XHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICAub24oJ2RibGNsaWNrLnpvb20nLCBudWxsKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKTtcclxuXHJcbiAgICAgICAgc3ZnUmVsYXRpb25zaGlwcyA9IHN2Zy5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmVsYXRpb25zaGlwcycpO1xyXG5cclxuICAgICAgICBzdmdOb2RlcyA9IHN2Zy5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnbm9kZXMnKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbWFnZVRvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdpbWFnZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAnMjRweCcgOiAnMzBweCc7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCd4JywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCcgOiAnLTE1cHgnO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cigneGxpbms6aHJlZicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaW1hZ2UoZCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCcgOiAnLTE2cHgnO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAnMjRweCcgOiAnMzBweCc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9QYW5lbChjb250YWluZXIpIHtcclxuICAgICAgICByZXR1cm4gY29udGFpbmVyLmFwcGVuZCgnZGl2JylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMtaW5mbycpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50KGNscywgaXNOb2RlLCBwcm9wZXJ0eSwgdmFsdWUpIHtcclxuICAgICAgICB2YXIgZWxlbSA9IGluZm8uYXBwZW5kKCdhJyk7XHJcblxyXG4gICAgICAgIGVsZW0uYXR0cignaHJlZicsICcjJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgY2xzKVxyXG4gICAgICAgICAgICAuaHRtbCgnPHN0cm9uZz4nICsgcHJvcGVydHkgKyAnPC9zdHJvbmc+JyArICh2YWx1ZSA/ICgnOiAnICsgdmFsdWUpIDogJycpKTtcclxuXHJcbiAgICAgICAgaWYgKCF2YWx1ZSkge1xyXG4gICAgICAgICAgICBlbGVtLnN0eWxlKCdiYWNrZ3JvdW5kLWNvbG9yJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA6IChpc05vZGUgPyBjbGFzczJjb2xvcihwcm9wZXJ0eSkgOiBkZWZhdWx0Q29sb3IoKSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc3R5bGUoJ2JvcmRlci1jb2xvcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6IChpc05vZGUgPyBjbGFzczJkYXJrZW5Db2xvcihwcm9wZXJ0eSkgOiBkZWZhdWx0RGFya2VuQ29sb3IoKSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdjb2xvcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6ICcjZmZmJztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudENsYXNzKGNscywgbm9kZSkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgdHJ1ZSwgbm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eShjbHMsIHByb3BlcnR5LCB2YWx1ZSkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgZmFsc2UsIHByb3BlcnR5LCB2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRSZWxhdGlvbnNoaXAoY2xzLCByZWxhdGlvbnNoaXApIHtcclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGZhbHNlLCByZWxhdGlvbnNoaXApO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZENvbnRleHRNZW51KG5vZGUsIGluZGV4KSB7XHJcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBjb250YWluZXIgZm9yIHRoZSBjb250ZXh0IG1lbnVcclxuICAgICAgICBkMy5zZWxlY3RBbGwoJy5jb250ZXh0LW1lbnUnKS5kYXRhKFsxXSlcclxuICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgLmFwcGVuZCgnZGl2JylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2NvbnRleHQtbWVudScpO1xyXG5cclxuICAgICAgICAvLyBIaWRlIHRoZSBjb250ZXh0LW1lbnUgaWYgaXQgZ29lcyBvdXQgb2YgZm9jdXMgXHJcbiAgICAgICAgZDMuc2VsZWN0KCdib2R5Jykub24oJ2NsaWNrLmNvbnRleHQtbWVudScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZDMuc2VsZWN0KCcuY29udGV4dC1tZW51Jykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBBcHBlbmQgZGF0YSB0byB0aGUgY29udGV4dCBtZW51XHJcbiAgICAgICAgZDMuc2VsZWN0QWxsKCcuY29udGV4dC1tZW51JylcclxuICAgICAgICAgICAgLmh0bWwoJycpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ3VsJylcclxuICAgICAgICAgICAgLnNlbGVjdEFsbCgnbGknKVxyXG4gICAgICAgICAgICAuZGF0YShvcHRpb25zLmNvbnRleHRNZW51KVxyXG4gICAgICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdsaScpXHJcbiAgICAgICAgICAgIC5vbignY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmhhbmRsZXIobm9kZSk7XHJcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoJy5jb250ZXh0LW1lbnUnKS5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2knKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuaWNvbjtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIiBcIiArIGQudGV4dDtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFNob3cgdGhlIGNvbnRleHQgbWVudVxyXG4gICAgICAgIGQzLnNlbGVjdCgnLmNvbnRleHQtbWVudScpXHJcbiAgICAgICAgICAgIC5zdHlsZSgnbGVmdCcsIChkMy5ldmVudC5wYWdlWCAtIDIpICsgJ3B4JylcclxuICAgICAgICAgICAgLnN0eWxlKCd0b3AnLCAoZDMuZXZlbnQucGFnZVkgLSAyKSArICdweCcpXHJcbiAgICAgICAgICAgIC5zdHlsZSgnZGlzcGxheScsICdibG9jaycpO1xyXG4gICAgICAgIGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kTm9kZSgpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5lbnRlcigpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAub24oJ2NvbnRleHRtZW51JywgYXBwZW5kQ29udGV4dE1lbnUpXHJcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgIGQudXVpZCA9IGd1aWQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLnV1aWQ7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaGlnaGxpZ2h0LCBpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgPSAnbm9kZScsXHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBkLmxhYmVsc1swXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaWNvbihkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWljb24nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpbWFnZShkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWltYWdlJztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5oaWdobGlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgb3B0aW9ucy5oaWdobGlnaHQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGlnaGxpZ2h0ID0gb3B0aW9ucy5oaWdobGlnaHRbaV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZC5sYWJlbHNbMF0gPT09IGhpZ2hsaWdodC5jbGFzcyAmJiBkLnByb3BlcnRpZXNbaGlnaGxpZ2h0LnByb3BlcnR5XSA9PT0gaGlnaGxpZ2h0LnZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzICs9ICcgbm9kZS1oaWdobGlnaHRlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2xhc3NlcztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICBkLmZ4ID0gZC5meSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVDbGljayhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uIChkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVEb3VibGVDbGljayhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlSW5mbyhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlTW91c2VFbnRlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlTW91c2VFbnRlcihkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24gKGQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlTW91c2VMZWF2ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlTW91c2VMZWF2ZShkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhbGwoZDMuZHJhZygpXHJcbiAgICAgICAgICAgICAgICAub24oJ3N0YXJ0JywgZHJhZ1N0YXJ0ZWQpXHJcbiAgICAgICAgICAgICAgICAub24oJ2RyYWcnLCBkcmFnZ2VkKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdlbmQnLCBkcmFnRW5kZWQpKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmROb2RlVG9HcmFwaCgpIHtcclxuICAgICAgICB2YXIgbiA9IGFwcGVuZE5vZGUoKTtcclxuXHJcbiAgICAgICAgYXBwZW5kUmluZ1RvTm9kZShuKTtcclxuICAgICAgICBhcHBlbmRPdXRsaW5lVG9Ob2RlKG4pO1xyXG4gICAgICAgIGFwcGVuZFRleHRUb05vZGUobik7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmltYWdlcykge1xyXG4gICAgICAgICAgICBhcHBlbmRJbWFnZVRvTm9kZShuKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE91dGxpbmVUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ291dGxpbmUnKVxyXG4gICAgICAgICAgICAuYXR0cigncicsIG9wdGlvbnMubm9kZVJhZGl1cylcclxuICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA6IGNsYXNzMmNvbG9yKGQubGFiZWxzWzBdKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0eWxlKCdzdHJva2UnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6IGNsYXNzMmRhcmtlbkNvbG9yKGQubGFiZWxzWzBdKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9TdHJpbmcoZCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJpbmdUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JpbmcnKVxyXG4gICAgICAgICAgICAuYXR0cigncicsIG9wdGlvbnMubm9kZVJhZGl1cyAqIDEuMTYpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nKGQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRUZXh0VG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvcGVydGllcy5uYW1lO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjMDAwMDAwJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/IChvcHRpb25zLm5vZGVSYWRpdXMgKyAncHgnKSA6ICcxMHB4JztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxyXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcclxuICAgICAgICAgICAgLmF0dHIoJ3knLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAocGFyc2VJbnQoTWF0aC5yb3VuZChvcHRpb25zLm5vZGVSYWRpdXMgKiAwLjMyKSkgKyAncHgnKSA6ICc0cHgnO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSkge1xyXG4gICAgICAgIHZhciBkYXRhID0gcmFuZG9tRDNEYXRhKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSk7XHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSZWxhdGlvbnNoaXAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uc2hpcC5lbnRlcigpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAuYXR0cignaWQnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICBkLnV1aWQgPSBndWlkKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC51dWlkO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmVsYXRpb25zaGlwJylcclxuICAgICAgICAgICAgLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25SZWxhdGlvbnNoaXBEb3VibGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25SZWxhdGlvbnNoaXBEb3VibGVDbGljayhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlSW5mbyhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kT3V0bGluZVRvUmVsYXRpb25zaGlwKHIpIHtcclxuICAgICAgICByZXR1cm4gci5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnb3V0bGluZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyNhNWFiYjYnKVxyXG4gICAgICAgICAgICAuYXR0cignc3Ryb2tlJywgJ25vbmUnKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRPdmVybGF5VG9SZWxhdGlvbnNoaXAocikge1xyXG4gICAgICAgIHJldHVybiByLmFwcGVuZCgncGF0aCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdvdmVybGF5Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kVGV4dFRvUmVsYXRpb25zaGlwKHIpIHtcclxuICAgICAgICByZXR1cm4gci5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAndGV4dCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyMwMDAwMDAnKVxyXG4gICAgICAgICAgICAuYXR0cignZm9udC1zaXplJywgJzhweCcpXHJcbiAgICAgICAgICAgIC5hdHRyKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcclxuICAgICAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC50eXBlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSZWxhdGlvbnNoaXBUb0dyYXBoKCkge1xyXG4gICAgICAgIHZhciByZWxhdGlvbnNoaXAgPSBhcHBlbmRSZWxhdGlvbnNoaXAoKSxcclxuICAgICAgICAgICAgdGV4dCA9IGFwcGVuZFRleHRUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApLFxyXG4gICAgICAgICAgICBvdXRsaW5lID0gYXBwZW5kT3V0bGluZVRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCksXHJcbiAgICAgICAgICAgIG92ZXJsYXkgPSBhcHBlbmRPdmVybGF5VG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgb3V0bGluZTogb3V0bGluZSxcclxuICAgICAgICAgICAgb3ZlcmxheTogb3ZlcmxheSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwOiByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHRleHQ6IHRleHRcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNsYXNzMmNvbG9yKGNscykge1xyXG4gICAgICAgIHZhciBjb2xvciA9IGNsYXNzZXMyY29sb3JzW2Nsc107XHJcblxyXG4gICAgICAgIGlmICghY29sb3IpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICAgICBjb2xvciA9IG9wdGlvbnMuY29sb3JzW01hdGgubWluKG51bUNsYXNzZXMsIG9wdGlvbnMuY29sb3JzLmxlbmd0aCAtIDEpXTtcclxuICAgICAgICAgICAgY29sb3IgPSBvcHRpb25zLmNvbG9yc1tudW1DbGFzc2VzICUgb3B0aW9ucy5jb2xvcnMubGVuZ3RoXTtcclxuICAgICAgICAgICAgY2xhc3NlczJjb2xvcnNbY2xzXSA9IGNvbG9yO1xyXG4gICAgICAgICAgICBudW1DbGFzc2VzKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xhc3MyZGFya2VuQ29sb3IoY2xzKSB7XHJcbiAgICAgICAgcmV0dXJuIGQzLnJnYihjbGFzczJjb2xvcihjbHMpKS5kYXJrZXIoMSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xlYXJJbmZvKCkge1xyXG4gICAgICAgIGluZm8uaHRtbCgnJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29sb3JzKCkge1xyXG4gICAgICAgIC8vIGQzLnNjaGVtZUNhdGVnb3J5MTAsXHJcbiAgICAgICAgLy8gZDMuc2NoZW1lQ2F0ZWdvcnkyMCxcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAnIzY4YmRmNicsIC8vIGxpZ2h0IGJsdWVcclxuICAgICAgICAgICAgJyM2ZGNlOWUnLCAvLyBncmVlbiAjMVxyXG4gICAgICAgICAgICAnI2ZhYWZjMicsIC8vIGxpZ2h0IHBpbmtcclxuICAgICAgICAgICAgJyNmMmJhZjYnLCAvLyBwdXJwbGVcclxuICAgICAgICAgICAgJyNmZjkyOGMnLCAvLyBsaWdodCByZWRcclxuICAgICAgICAgICAgJyNmY2VhN2UnLCAvLyBsaWdodCB5ZWxsb3dcclxuICAgICAgICAgICAgJyNmZmM3NjYnLCAvLyBsaWdodCBvcmFuZ2VcclxuICAgICAgICAgICAgJyM0MDVmOWUnLCAvLyBuYXZ5IGJsdWVcclxuICAgICAgICAgICAgJyNhNWFiYjYnLCAvLyBkYXJrIGdyYXlcclxuICAgICAgICAgICAgJyM3OGNlY2InLCAvLyBncmVlbiAjMixcclxuICAgICAgICAgICAgJyNiODhjYmInLCAvLyBkYXJrIHB1cnBsZVxyXG4gICAgICAgICAgICAnI2NlZDJkOScsIC8vIGxpZ2h0IGdyYXlcclxuICAgICAgICAgICAgJyNlODQ2NDYnLCAvLyBkYXJrIHJlZFxyXG4gICAgICAgICAgICAnI2ZhNWY4NicsIC8vIGRhcmsgcGlua1xyXG4gICAgICAgICAgICAnI2ZmYWIxYScsIC8vIGRhcmsgb3JhbmdlXHJcbiAgICAgICAgICAgICcjZmNkYTE5JywgLy8gZGFyayB5ZWxsb3dcclxuICAgICAgICAgICAgJyM3OTdiODAnLCAvLyBibGFja1xyXG4gICAgICAgICAgICAnI2M5ZDk2ZicsIC8vIHBpc3RhY2NoaW9cclxuICAgICAgICAgICAgJyM0Nzk5MWYnLCAvLyBncmVlbiAjM1xyXG4gICAgICAgICAgICAnIzcwZWRlZScsIC8vIHR1cnF1b2lzZVxyXG4gICAgICAgICAgICAnI2ZmNzVlYScgIC8vIHBpbmtcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbnRhaW5zKGFycmF5LCBpZCkge1xyXG4gICAgICAgIHZhciBmaWx0ZXIgPSBhcnJheS5maWx0ZXIoZnVuY3Rpb24gKGVsZW0pIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW0uaWQgPT09IGlkO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gZmlsdGVyLmxlbmd0aCA+IDA7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVmYXVsdENvbG9yKCkge1xyXG4gICAgICAgIHJldHVybiBvcHRpb25zLnJlbGF0aW9uc2hpcENvbG9yO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlZmF1bHREYXJrZW5Db2xvcigpIHtcclxuICAgICAgICByZXR1cm4gZDMucmdiKG9wdGlvbnMuY29sb3JzW29wdGlvbnMuY29sb3JzLmxlbmd0aCAtIDFdKS5kYXJrZXIoMSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhZ0VuZGVkKGQpIHtcclxuICAgICAgICBpZiAoIWQzLmV2ZW50LmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURyYWdFbmQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVEcmFnRW5kKGQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnZ2VkKGQpIHtcclxuICAgICAgICBzdGlja05vZGUoZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhZ1N0YXJ0ZWQoZCkge1xyXG4gICAgICAgIGlmICghZDMuZXZlbnQuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIHNpbXVsYXRpb24uYWxwaGFUYXJnZXQoMC4zKS5yZXN0YXJ0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkLmZ4ID0gZC54O1xyXG4gICAgICAgIGQuZnkgPSBkLnk7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEcmFnU3RhcnQgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVEcmFnU3RhcnQoZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGV4dGVuZChvYmoxLCBvYmoyKSB7XHJcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xyXG5cclxuICAgICAgICBtZXJnZShvYmosIG9iajEpO1xyXG4gICAgICAgIG1lcmdlKG9iaiwgb2JqMik7XHJcblxyXG4gICAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZm9udEF3ZXNvbWVJY29ucygpIHtcclxuICAgICAgICByZXR1cm4geyAnZ2xhc3MnOiAnZjAwMCcsICdtdXNpYyc6ICdmMDAxJywgJ3NlYXJjaCc6ICdmMDAyJywgJ2VudmVsb3BlLW8nOiAnZjAwMycsICdoZWFydCc6ICdmMDA0JywgJ3N0YXInOiAnZjAwNScsICdzdGFyLW8nOiAnZjAwNicsICd1c2VyJzogJ2YwMDcnLCAnZmlsbSc6ICdmMDA4JywgJ3RoLWxhcmdlJzogJ2YwMDknLCAndGgnOiAnZjAwYScsICd0aC1saXN0JzogJ2YwMGInLCAnY2hlY2snOiAnZjAwYycsICdyZW1vdmUsY2xvc2UsdGltZXMnOiAnZjAwZCcsICdzZWFyY2gtcGx1cyc6ICdmMDBlJywgJ3NlYXJjaC1taW51cyc6ICdmMDEwJywgJ3Bvd2VyLW9mZic6ICdmMDExJywgJ3NpZ25hbCc6ICdmMDEyJywgJ2dlYXIsY29nJzogJ2YwMTMnLCAndHJhc2gtbyc6ICdmMDE0JywgJ2hvbWUnOiAnZjAxNScsICdmaWxlLW8nOiAnZjAxNicsICdjbG9jay1vJzogJ2YwMTcnLCAncm9hZCc6ICdmMDE4JywgJ2Rvd25sb2FkJzogJ2YwMTknLCAnYXJyb3ctY2lyY2xlLW8tZG93bic6ICdmMDFhJywgJ2Fycm93LWNpcmNsZS1vLXVwJzogJ2YwMWInLCAnaW5ib3gnOiAnZjAxYycsICdwbGF5LWNpcmNsZS1vJzogJ2YwMWQnLCAncm90YXRlLXJpZ2h0LHJlcGVhdCc6ICdmMDFlJywgJ3JlZnJlc2gnOiAnZjAyMScsICdsaXN0LWFsdCc6ICdmMDIyJywgJ2xvY2snOiAnZjAyMycsICdmbGFnJzogJ2YwMjQnLCAnaGVhZHBob25lcyc6ICdmMDI1JywgJ3ZvbHVtZS1vZmYnOiAnZjAyNicsICd2b2x1bWUtZG93bic6ICdmMDI3JywgJ3ZvbHVtZS11cCc6ICdmMDI4JywgJ3FyY29kZSc6ICdmMDI5JywgJ2JhcmNvZGUnOiAnZjAyYScsICd0YWcnOiAnZjAyYicsICd0YWdzJzogJ2YwMmMnLCAnYm9vayc6ICdmMDJkJywgJ2Jvb2ttYXJrJzogJ2YwMmUnLCAncHJpbnQnOiAnZjAyZicsICdjYW1lcmEnOiAnZjAzMCcsICdmb250JzogJ2YwMzEnLCAnYm9sZCc6ICdmMDMyJywgJ2l0YWxpYyc6ICdmMDMzJywgJ3RleHQtaGVpZ2h0JzogJ2YwMzQnLCAndGV4dC13aWR0aCc6ICdmMDM1JywgJ2FsaWduLWxlZnQnOiAnZjAzNicsICdhbGlnbi1jZW50ZXInOiAnZjAzNycsICdhbGlnbi1yaWdodCc6ICdmMDM4JywgJ2FsaWduLWp1c3RpZnknOiAnZjAzOScsICdsaXN0JzogJ2YwM2EnLCAnZGVkZW50LG91dGRlbnQnOiAnZjAzYicsICdpbmRlbnQnOiAnZjAzYycsICd2aWRlby1jYW1lcmEnOiAnZjAzZCcsICdwaG90byxpbWFnZSxwaWN0dXJlLW8nOiAnZjAzZScsICdwZW5jaWwnOiAnZjA0MCcsICdtYXAtbWFya2VyJzogJ2YwNDEnLCAnYWRqdXN0JzogJ2YwNDInLCAndGludCc6ICdmMDQzJywgJ2VkaXQscGVuY2lsLXNxdWFyZS1vJzogJ2YwNDQnLCAnc2hhcmUtc3F1YXJlLW8nOiAnZjA0NScsICdjaGVjay1zcXVhcmUtbyc6ICdmMDQ2JywgJ2Fycm93cyc6ICdmMDQ3JywgJ3N0ZXAtYmFja3dhcmQnOiAnZjA0OCcsICdmYXN0LWJhY2t3YXJkJzogJ2YwNDknLCAnYmFja3dhcmQnOiAnZjA0YScsICdwbGF5JzogJ2YwNGInLCAncGF1c2UnOiAnZjA0YycsICdzdG9wJzogJ2YwNGQnLCAnZm9yd2FyZCc6ICdmMDRlJywgJ2Zhc3QtZm9yd2FyZCc6ICdmMDUwJywgJ3N0ZXAtZm9yd2FyZCc6ICdmMDUxJywgJ2VqZWN0JzogJ2YwNTInLCAnY2hldnJvbi1sZWZ0JzogJ2YwNTMnLCAnY2hldnJvbi1yaWdodCc6ICdmMDU0JywgJ3BsdXMtY2lyY2xlJzogJ2YwNTUnLCAnbWludXMtY2lyY2xlJzogJ2YwNTYnLCAndGltZXMtY2lyY2xlJzogJ2YwNTcnLCAnY2hlY2stY2lyY2xlJzogJ2YwNTgnLCAncXVlc3Rpb24tY2lyY2xlJzogJ2YwNTknLCAnaW5mby1jaXJjbGUnOiAnZjA1YScsICdjcm9zc2hhaXJzJzogJ2YwNWInLCAndGltZXMtY2lyY2xlLW8nOiAnZjA1YycsICdjaGVjay1jaXJjbGUtbyc6ICdmMDVkJywgJ2Jhbic6ICdmMDVlJywgJ2Fycm93LWxlZnQnOiAnZjA2MCcsICdhcnJvdy1yaWdodCc6ICdmMDYxJywgJ2Fycm93LXVwJzogJ2YwNjInLCAnYXJyb3ctZG93bic6ICdmMDYzJywgJ21haWwtZm9yd2FyZCxzaGFyZSc6ICdmMDY0JywgJ2V4cGFuZCc6ICdmMDY1JywgJ2NvbXByZXNzJzogJ2YwNjYnLCAncGx1cyc6ICdmMDY3JywgJ21pbnVzJzogJ2YwNjgnLCAnYXN0ZXJpc2snOiAnZjA2OScsICdleGNsYW1hdGlvbi1jaXJjbGUnOiAnZjA2YScsICdnaWZ0JzogJ2YwNmInLCAnbGVhZic6ICdmMDZjJywgJ2ZpcmUnOiAnZjA2ZCcsICdleWUnOiAnZjA2ZScsICdleWUtc2xhc2gnOiAnZjA3MCcsICd3YXJuaW5nLGV4Y2xhbWF0aW9uLXRyaWFuZ2xlJzogJ2YwNzEnLCAncGxhbmUnOiAnZjA3MicsICdjYWxlbmRhcic6ICdmMDczJywgJ3JhbmRvbSc6ICdmMDc0JywgJ2NvbW1lbnQnOiAnZjA3NScsICdtYWduZXQnOiAnZjA3NicsICdjaGV2cm9uLXVwJzogJ2YwNzcnLCAnY2hldnJvbi1kb3duJzogJ2YwNzgnLCAncmV0d2VldCc6ICdmMDc5JywgJ3Nob3BwaW5nLWNhcnQnOiAnZjA3YScsICdmb2xkZXInOiAnZjA3YicsICdmb2xkZXItb3Blbic6ICdmMDdjJywgJ2Fycm93cy12JzogJ2YwN2QnLCAnYXJyb3dzLWgnOiAnZjA3ZScsICdiYXItY2hhcnQtbyxiYXItY2hhcnQnOiAnZjA4MCcsICd0d2l0dGVyLXNxdWFyZSc6ICdmMDgxJywgJ2ZhY2Vib29rLXNxdWFyZSc6ICdmMDgyJywgJ2NhbWVyYS1yZXRybyc6ICdmMDgzJywgJ2tleSc6ICdmMDg0JywgJ2dlYXJzLGNvZ3MnOiAnZjA4NScsICdjb21tZW50cyc6ICdmMDg2JywgJ3RodW1icy1vLXVwJzogJ2YwODcnLCAndGh1bWJzLW8tZG93bic6ICdmMDg4JywgJ3N0YXItaGFsZic6ICdmMDg5JywgJ2hlYXJ0LW8nOiAnZjA4YScsICdzaWduLW91dCc6ICdmMDhiJywgJ2xpbmtlZGluLXNxdWFyZSc6ICdmMDhjJywgJ3RodW1iLXRhY2snOiAnZjA4ZCcsICdleHRlcm5hbC1saW5rJzogJ2YwOGUnLCAnc2lnbi1pbic6ICdmMDkwJywgJ3Ryb3BoeSc6ICdmMDkxJywgJ2dpdGh1Yi1zcXVhcmUnOiAnZjA5MicsICd1cGxvYWQnOiAnZjA5MycsICdsZW1vbi1vJzogJ2YwOTQnLCAncGhvbmUnOiAnZjA5NScsICdzcXVhcmUtbyc6ICdmMDk2JywgJ2Jvb2ttYXJrLW8nOiAnZjA5NycsICdwaG9uZS1zcXVhcmUnOiAnZjA5OCcsICd0d2l0dGVyJzogJ2YwOTknLCAnZmFjZWJvb2stZixmYWNlYm9vayc6ICdmMDlhJywgJ2dpdGh1Yic6ICdmMDliJywgJ3VubG9jayc6ICdmMDljJywgJ2NyZWRpdC1jYXJkJzogJ2YwOWQnLCAnZmVlZCxyc3MnOiAnZjA5ZScsICdoZGQtbyc6ICdmMGEwJywgJ2J1bGxob3JuJzogJ2YwYTEnLCAnYmVsbCc6ICdmMGYzJywgJ2NlcnRpZmljYXRlJzogJ2YwYTMnLCAnaGFuZC1vLXJpZ2h0JzogJ2YwYTQnLCAnaGFuZC1vLWxlZnQnOiAnZjBhNScsICdoYW5kLW8tdXAnOiAnZjBhNicsICdoYW5kLW8tZG93bic6ICdmMGE3JywgJ2Fycm93LWNpcmNsZS1sZWZ0JzogJ2YwYTgnLCAnYXJyb3ctY2lyY2xlLXJpZ2h0JzogJ2YwYTknLCAnYXJyb3ctY2lyY2xlLXVwJzogJ2YwYWEnLCAnYXJyb3ctY2lyY2xlLWRvd24nOiAnZjBhYicsICdnbG9iZSc6ICdmMGFjJywgJ3dyZW5jaCc6ICdmMGFkJywgJ3Rhc2tzJzogJ2YwYWUnLCAnZmlsdGVyJzogJ2YwYjAnLCAnYnJpZWZjYXNlJzogJ2YwYjEnLCAnYXJyb3dzLWFsdCc6ICdmMGIyJywgJ2dyb3VwLHVzZXJzJzogJ2YwYzAnLCAnY2hhaW4sbGluayc6ICdmMGMxJywgJ2Nsb3VkJzogJ2YwYzInLCAnZmxhc2snOiAnZjBjMycsICdjdXQsc2Npc3NvcnMnOiAnZjBjNCcsICdjb3B5LGZpbGVzLW8nOiAnZjBjNScsICdwYXBlcmNsaXAnOiAnZjBjNicsICdzYXZlLGZsb3BweS1vJzogJ2YwYzcnLCAnc3F1YXJlJzogJ2YwYzgnLCAnbmF2aWNvbixyZW9yZGVyLGJhcnMnOiAnZjBjOScsICdsaXN0LXVsJzogJ2YwY2EnLCAnbGlzdC1vbCc6ICdmMGNiJywgJ3N0cmlrZXRocm91Z2gnOiAnZjBjYycsICd1bmRlcmxpbmUnOiAnZjBjZCcsICd0YWJsZSc6ICdmMGNlJywgJ21hZ2ljJzogJ2YwZDAnLCAndHJ1Y2snOiAnZjBkMScsICdwaW50ZXJlc3QnOiAnZjBkMicsICdwaW50ZXJlc3Qtc3F1YXJlJzogJ2YwZDMnLCAnZ29vZ2xlLXBsdXMtc3F1YXJlJzogJ2YwZDQnLCAnZ29vZ2xlLXBsdXMnOiAnZjBkNScsICdtb25leSc6ICdmMGQ2JywgJ2NhcmV0LWRvd24nOiAnZjBkNycsICdjYXJldC11cCc6ICdmMGQ4JywgJ2NhcmV0LWxlZnQnOiAnZjBkOScsICdjYXJldC1yaWdodCc6ICdmMGRhJywgJ2NvbHVtbnMnOiAnZjBkYicsICd1bnNvcnRlZCxzb3J0JzogJ2YwZGMnLCAnc29ydC1kb3duLHNvcnQtZGVzYyc6ICdmMGRkJywgJ3NvcnQtdXAsc29ydC1hc2MnOiAnZjBkZScsICdlbnZlbG9wZSc6ICdmMGUwJywgJ2xpbmtlZGluJzogJ2YwZTEnLCAncm90YXRlLWxlZnQsdW5kbyc6ICdmMGUyJywgJ2xlZ2FsLGdhdmVsJzogJ2YwZTMnLCAnZGFzaGJvYXJkLHRhY2hvbWV0ZXInOiAnZjBlNCcsICdjb21tZW50LW8nOiAnZjBlNScsICdjb21tZW50cy1vJzogJ2YwZTYnLCAnZmxhc2gsYm9sdCc6ICdmMGU3JywgJ3NpdGVtYXAnOiAnZjBlOCcsICd1bWJyZWxsYSc6ICdmMGU5JywgJ3Bhc3RlLGNsaXBib2FyZCc6ICdmMGVhJywgJ2xpZ2h0YnVsYi1vJzogJ2YwZWInLCAnZXhjaGFuZ2UnOiAnZjBlYycsICdjbG91ZC1kb3dubG9hZCc6ICdmMGVkJywgJ2Nsb3VkLXVwbG9hZCc6ICdmMGVlJywgJ3VzZXItbWQnOiAnZjBmMCcsICdzdGV0aG9zY29wZSc6ICdmMGYxJywgJ3N1aXRjYXNlJzogJ2YwZjInLCAnYmVsbC1vJzogJ2YwYTInLCAnY29mZmVlJzogJ2YwZjQnLCAnY3V0bGVyeSc6ICdmMGY1JywgJ2ZpbGUtdGV4dC1vJzogJ2YwZjYnLCAnYnVpbGRpbmctbyc6ICdmMGY3JywgJ2hvc3BpdGFsLW8nOiAnZjBmOCcsICdhbWJ1bGFuY2UnOiAnZjBmOScsICdtZWRraXQnOiAnZjBmYScsICdmaWdodGVyLWpldCc6ICdmMGZiJywgJ2JlZXInOiAnZjBmYycsICdoLXNxdWFyZSc6ICdmMGZkJywgJ3BsdXMtc3F1YXJlJzogJ2YwZmUnLCAnYW5nbGUtZG91YmxlLWxlZnQnOiAnZjEwMCcsICdhbmdsZS1kb3VibGUtcmlnaHQnOiAnZjEwMScsICdhbmdsZS1kb3VibGUtdXAnOiAnZjEwMicsICdhbmdsZS1kb3VibGUtZG93bic6ICdmMTAzJywgJ2FuZ2xlLWxlZnQnOiAnZjEwNCcsICdhbmdsZS1yaWdodCc6ICdmMTA1JywgJ2FuZ2xlLXVwJzogJ2YxMDYnLCAnYW5nbGUtZG93bic6ICdmMTA3JywgJ2Rlc2t0b3AnOiAnZjEwOCcsICdsYXB0b3AnOiAnZjEwOScsICd0YWJsZXQnOiAnZjEwYScsICdtb2JpbGUtcGhvbmUsbW9iaWxlJzogJ2YxMGInLCAnY2lyY2xlLW8nOiAnZjEwYycsICdxdW90ZS1sZWZ0JzogJ2YxMGQnLCAncXVvdGUtcmlnaHQnOiAnZjEwZScsICdzcGlubmVyJzogJ2YxMTAnLCAnY2lyY2xlJzogJ2YxMTEnLCAnbWFpbC1yZXBseSxyZXBseSc6ICdmMTEyJywgJ2dpdGh1Yi1hbHQnOiAnZjExMycsICdmb2xkZXItbyc6ICdmMTE0JywgJ2ZvbGRlci1vcGVuLW8nOiAnZjExNScsICdzbWlsZS1vJzogJ2YxMTgnLCAnZnJvd24tbyc6ICdmMTE5JywgJ21laC1vJzogJ2YxMWEnLCAnZ2FtZXBhZCc6ICdmMTFiJywgJ2tleWJvYXJkLW8nOiAnZjExYycsICdmbGFnLW8nOiAnZjExZCcsICdmbGFnLWNoZWNrZXJlZCc6ICdmMTFlJywgJ3Rlcm1pbmFsJzogJ2YxMjAnLCAnY29kZSc6ICdmMTIxJywgJ21haWwtcmVwbHktYWxsLHJlcGx5LWFsbCc6ICdmMTIyJywgJ3N0YXItaGFsZi1lbXB0eSxzdGFyLWhhbGYtZnVsbCxzdGFyLWhhbGYtbyc6ICdmMTIzJywgJ2xvY2F0aW9uLWFycm93JzogJ2YxMjQnLCAnY3JvcCc6ICdmMTI1JywgJ2NvZGUtZm9yayc6ICdmMTI2JywgJ3VubGluayxjaGFpbi1icm9rZW4nOiAnZjEyNycsICdxdWVzdGlvbic6ICdmMTI4JywgJ2luZm8nOiAnZjEyOScsICdleGNsYW1hdGlvbic6ICdmMTJhJywgJ3N1cGVyc2NyaXB0JzogJ2YxMmInLCAnc3Vic2NyaXB0JzogJ2YxMmMnLCAnZXJhc2VyJzogJ2YxMmQnLCAncHV6emxlLXBpZWNlJzogJ2YxMmUnLCAnbWljcm9waG9uZSc6ICdmMTMwJywgJ21pY3JvcGhvbmUtc2xhc2gnOiAnZjEzMScsICdzaGllbGQnOiAnZjEzMicsICdjYWxlbmRhci1vJzogJ2YxMzMnLCAnZmlyZS1leHRpbmd1aXNoZXInOiAnZjEzNCcsICdyb2NrZXQnOiAnZjEzNScsICdtYXhjZG4nOiAnZjEzNicsICdjaGV2cm9uLWNpcmNsZS1sZWZ0JzogJ2YxMzcnLCAnY2hldnJvbi1jaXJjbGUtcmlnaHQnOiAnZjEzOCcsICdjaGV2cm9uLWNpcmNsZS11cCc6ICdmMTM5JywgJ2NoZXZyb24tY2lyY2xlLWRvd24nOiAnZjEzYScsICdodG1sNSc6ICdmMTNiJywgJ2NzczMnOiAnZjEzYycsICdhbmNob3InOiAnZjEzZCcsICd1bmxvY2stYWx0JzogJ2YxM2UnLCAnYnVsbHNleWUnOiAnZjE0MCcsICdlbGxpcHNpcy1oJzogJ2YxNDEnLCAnZWxsaXBzaXMtdic6ICdmMTQyJywgJ3Jzcy1zcXVhcmUnOiAnZjE0MycsICdwbGF5LWNpcmNsZSc6ICdmMTQ0JywgJ3RpY2tldCc6ICdmMTQ1JywgJ21pbnVzLXNxdWFyZSc6ICdmMTQ2JywgJ21pbnVzLXNxdWFyZS1vJzogJ2YxNDcnLCAnbGV2ZWwtdXAnOiAnZjE0OCcsICdsZXZlbC1kb3duJzogJ2YxNDknLCAnY2hlY2stc3F1YXJlJzogJ2YxNGEnLCAncGVuY2lsLXNxdWFyZSc6ICdmMTRiJywgJ2V4dGVybmFsLWxpbmstc3F1YXJlJzogJ2YxNGMnLCAnc2hhcmUtc3F1YXJlJzogJ2YxNGQnLCAnY29tcGFzcyc6ICdmMTRlJywgJ3RvZ2dsZS1kb3duLGNhcmV0LXNxdWFyZS1vLWRvd24nOiAnZjE1MCcsICd0b2dnbGUtdXAsY2FyZXQtc3F1YXJlLW8tdXAnOiAnZjE1MScsICd0b2dnbGUtcmlnaHQsY2FyZXQtc3F1YXJlLW8tcmlnaHQnOiAnZjE1MicsICdldXJvLGV1cic6ICdmMTUzJywgJ2dicCc6ICdmMTU0JywgJ2RvbGxhcix1c2QnOiAnZjE1NScsICdydXBlZSxpbnInOiAnZjE1NicsICdjbnkscm1iLHllbixqcHknOiAnZjE1NycsICdydWJsZSxyb3VibGUscnViJzogJ2YxNTgnLCAnd29uLGtydyc6ICdmMTU5JywgJ2JpdGNvaW4sYnRjJzogJ2YxNWEnLCAnZmlsZSc6ICdmMTViJywgJ2ZpbGUtdGV4dCc6ICdmMTVjJywgJ3NvcnQtYWxwaGEtYXNjJzogJ2YxNWQnLCAnc29ydC1hbHBoYS1kZXNjJzogJ2YxNWUnLCAnc29ydC1hbW91bnQtYXNjJzogJ2YxNjAnLCAnc29ydC1hbW91bnQtZGVzYyc6ICdmMTYxJywgJ3NvcnQtbnVtZXJpYy1hc2MnOiAnZjE2MicsICdzb3J0LW51bWVyaWMtZGVzYyc6ICdmMTYzJywgJ3RodW1icy11cCc6ICdmMTY0JywgJ3RodW1icy1kb3duJzogJ2YxNjUnLCAneW91dHViZS1zcXVhcmUnOiAnZjE2NicsICd5b3V0dWJlJzogJ2YxNjcnLCAneGluZyc6ICdmMTY4JywgJ3hpbmctc3F1YXJlJzogJ2YxNjknLCAneW91dHViZS1wbGF5JzogJ2YxNmEnLCAnZHJvcGJveCc6ICdmMTZiJywgJ3N0YWNrLW92ZXJmbG93JzogJ2YxNmMnLCAnaW5zdGFncmFtJzogJ2YxNmQnLCAnZmxpY2tyJzogJ2YxNmUnLCAnYWRuJzogJ2YxNzAnLCAnYml0YnVja2V0JzogJ2YxNzEnLCAnYml0YnVja2V0LXNxdWFyZSc6ICdmMTcyJywgJ3R1bWJscic6ICdmMTczJywgJ3R1bWJsci1zcXVhcmUnOiAnZjE3NCcsICdsb25nLWFycm93LWRvd24nOiAnZjE3NScsICdsb25nLWFycm93LXVwJzogJ2YxNzYnLCAnbG9uZy1hcnJvdy1sZWZ0JzogJ2YxNzcnLCAnbG9uZy1hcnJvdy1yaWdodCc6ICdmMTc4JywgJ2FwcGxlJzogJ2YxNzknLCAnd2luZG93cyc6ICdmMTdhJywgJ2FuZHJvaWQnOiAnZjE3YicsICdsaW51eCc6ICdmMTdjJywgJ2RyaWJiYmxlJzogJ2YxN2QnLCAnc2t5cGUnOiAnZjE3ZScsICdmb3Vyc3F1YXJlJzogJ2YxODAnLCAndHJlbGxvJzogJ2YxODEnLCAnZmVtYWxlJzogJ2YxODInLCAnbWFsZSc6ICdmMTgzJywgJ2dpdHRpcCxncmF0aXBheSc6ICdmMTg0JywgJ3N1bi1vJzogJ2YxODUnLCAnbW9vbi1vJzogJ2YxODYnLCAnYXJjaGl2ZSc6ICdmMTg3JywgJ2J1Zyc6ICdmMTg4JywgJ3ZrJzogJ2YxODknLCAnd2VpYm8nOiAnZjE4YScsICdyZW5yZW4nOiAnZjE4YicsICdwYWdlbGluZXMnOiAnZjE4YycsICdzdGFjay1leGNoYW5nZSc6ICdmMThkJywgJ2Fycm93LWNpcmNsZS1vLXJpZ2h0JzogJ2YxOGUnLCAnYXJyb3ctY2lyY2xlLW8tbGVmdCc6ICdmMTkwJywgJ3RvZ2dsZS1sZWZ0LGNhcmV0LXNxdWFyZS1vLWxlZnQnOiAnZjE5MScsICdkb3QtY2lyY2xlLW8nOiAnZjE5MicsICd3aGVlbGNoYWlyJzogJ2YxOTMnLCAndmltZW8tc3F1YXJlJzogJ2YxOTQnLCAndHVya2lzaC1saXJhLHRyeSc6ICdmMTk1JywgJ3BsdXMtc3F1YXJlLW8nOiAnZjE5NicsICdzcGFjZS1zaHV0dGxlJzogJ2YxOTcnLCAnc2xhY2snOiAnZjE5OCcsICdlbnZlbG9wZS1zcXVhcmUnOiAnZjE5OScsICd3b3JkcHJlc3MnOiAnZjE5YScsICdvcGVuaWQnOiAnZjE5YicsICdpbnN0aXR1dGlvbixiYW5rLHVuaXZlcnNpdHknOiAnZjE5YycsICdtb3J0YXItYm9hcmQsZ3JhZHVhdGlvbi1jYXAnOiAnZjE5ZCcsICd5YWhvbyc6ICdmMTllJywgJ2dvb2dsZSc6ICdmMWEwJywgJ3JlZGRpdCc6ICdmMWExJywgJ3JlZGRpdC1zcXVhcmUnOiAnZjFhMicsICdzdHVtYmxldXBvbi1jaXJjbGUnOiAnZjFhMycsICdzdHVtYmxldXBvbic6ICdmMWE0JywgJ2RlbGljaW91cyc6ICdmMWE1JywgJ2RpZ2cnOiAnZjFhNicsICdwaWVkLXBpcGVyLXBwJzogJ2YxYTcnLCAncGllZC1waXBlci1hbHQnOiAnZjFhOCcsICdkcnVwYWwnOiAnZjFhOScsICdqb29tbGEnOiAnZjFhYScsICdsYW5ndWFnZSc6ICdmMWFiJywgJ2ZheCc6ICdmMWFjJywgJ2J1aWxkaW5nJzogJ2YxYWQnLCAnY2hpbGQnOiAnZjFhZScsICdwYXcnOiAnZjFiMCcsICdzcG9vbic6ICdmMWIxJywgJ2N1YmUnOiAnZjFiMicsICdjdWJlcyc6ICdmMWIzJywgJ2JlaGFuY2UnOiAnZjFiNCcsICdiZWhhbmNlLXNxdWFyZSc6ICdmMWI1JywgJ3N0ZWFtJzogJ2YxYjYnLCAnc3RlYW0tc3F1YXJlJzogJ2YxYjcnLCAncmVjeWNsZSc6ICdmMWI4JywgJ2F1dG9tb2JpbGUsY2FyJzogJ2YxYjknLCAnY2FiLHRheGknOiAnZjFiYScsICd0cmVlJzogJ2YxYmInLCAnc3BvdGlmeSc6ICdmMWJjJywgJ2RldmlhbnRhcnQnOiAnZjFiZCcsICdzb3VuZGNsb3VkJzogJ2YxYmUnLCAnZGF0YWJhc2UnOiAnZjFjMCcsICdmaWxlLXBkZi1vJzogJ2YxYzEnLCAnZmlsZS13b3JkLW8nOiAnZjFjMicsICdmaWxlLWV4Y2VsLW8nOiAnZjFjMycsICdmaWxlLXBvd2VycG9pbnQtbyc6ICdmMWM0JywgJ2ZpbGUtcGhvdG8tbyxmaWxlLXBpY3R1cmUtbyxmaWxlLWltYWdlLW8nOiAnZjFjNScsICdmaWxlLXppcC1vLGZpbGUtYXJjaGl2ZS1vJzogJ2YxYzYnLCAnZmlsZS1zb3VuZC1vLGZpbGUtYXVkaW8tbyc6ICdmMWM3JywgJ2ZpbGUtbW92aWUtbyxmaWxlLXZpZGVvLW8nOiAnZjFjOCcsICdmaWxlLWNvZGUtbyc6ICdmMWM5JywgJ3ZpbmUnOiAnZjFjYScsICdjb2RlcGVuJzogJ2YxY2InLCAnanNmaWRkbGUnOiAnZjFjYycsICdsaWZlLWJvdXksbGlmZS1idW95LGxpZmUtc2F2ZXIsc3VwcG9ydCxsaWZlLXJpbmcnOiAnZjFjZCcsICdjaXJjbGUtby1ub3RjaCc6ICdmMWNlJywgJ3JhLHJlc2lzdGFuY2UscmViZWwnOiAnZjFkMCcsICdnZSxlbXBpcmUnOiAnZjFkMScsICdnaXQtc3F1YXJlJzogJ2YxZDInLCAnZ2l0JzogJ2YxZDMnLCAneS1jb21iaW5hdG9yLXNxdWFyZSx5Yy1zcXVhcmUsaGFja2VyLW5ld3MnOiAnZjFkNCcsICd0ZW5jZW50LXdlaWJvJzogJ2YxZDUnLCAncXEnOiAnZjFkNicsICd3ZWNoYXQsd2VpeGluJzogJ2YxZDcnLCAnc2VuZCxwYXBlci1wbGFuZSc6ICdmMWQ4JywgJ3NlbmQtbyxwYXBlci1wbGFuZS1vJzogJ2YxZDknLCAnaGlzdG9yeSc6ICdmMWRhJywgJ2NpcmNsZS10aGluJzogJ2YxZGInLCAnaGVhZGVyJzogJ2YxZGMnLCAncGFyYWdyYXBoJzogJ2YxZGQnLCAnc2xpZGVycyc6ICdmMWRlJywgJ3NoYXJlLWFsdCc6ICdmMWUwJywgJ3NoYXJlLWFsdC1zcXVhcmUnOiAnZjFlMScsICdib21iJzogJ2YxZTInLCAnc29jY2VyLWJhbGwtbyxmdXRib2wtbyc6ICdmMWUzJywgJ3R0eSc6ICdmMWU0JywgJ2Jpbm9jdWxhcnMnOiAnZjFlNScsICdwbHVnJzogJ2YxZTYnLCAnc2xpZGVzaGFyZSc6ICdmMWU3JywgJ3R3aXRjaCc6ICdmMWU4JywgJ3llbHAnOiAnZjFlOScsICduZXdzcGFwZXItbyc6ICdmMWVhJywgJ3dpZmknOiAnZjFlYicsICdjYWxjdWxhdG9yJzogJ2YxZWMnLCAncGF5cGFsJzogJ2YxZWQnLCAnZ29vZ2xlLXdhbGxldCc6ICdmMWVlJywgJ2NjLXZpc2EnOiAnZjFmMCcsICdjYy1tYXN0ZXJjYXJkJzogJ2YxZjEnLCAnY2MtZGlzY292ZXInOiAnZjFmMicsICdjYy1hbWV4JzogJ2YxZjMnLCAnY2MtcGF5cGFsJzogJ2YxZjQnLCAnY2Mtc3RyaXBlJzogJ2YxZjUnLCAnYmVsbC1zbGFzaCc6ICdmMWY2JywgJ2JlbGwtc2xhc2gtbyc6ICdmMWY3JywgJ3RyYXNoJzogJ2YxZjgnLCAnY29weXJpZ2h0JzogJ2YxZjknLCAnYXQnOiAnZjFmYScsICdleWVkcm9wcGVyJzogJ2YxZmInLCAncGFpbnQtYnJ1c2gnOiAnZjFmYycsICdiaXJ0aGRheS1jYWtlJzogJ2YxZmQnLCAnYXJlYS1jaGFydCc6ICdmMWZlJywgJ3BpZS1jaGFydCc6ICdmMjAwJywgJ2xpbmUtY2hhcnQnOiAnZjIwMScsICdsYXN0Zm0nOiAnZjIwMicsICdsYXN0Zm0tc3F1YXJlJzogJ2YyMDMnLCAndG9nZ2xlLW9mZic6ICdmMjA0JywgJ3RvZ2dsZS1vbic6ICdmMjA1JywgJ2JpY3ljbGUnOiAnZjIwNicsICdidXMnOiAnZjIwNycsICdpb3hob3N0JzogJ2YyMDgnLCAnYW5nZWxsaXN0JzogJ2YyMDknLCAnY2MnOiAnZjIwYScsICdzaGVrZWwsc2hlcWVsLGlscyc6ICdmMjBiJywgJ21lYW5wYXRoJzogJ2YyMGMnLCAnYnV5c2VsbGFkcyc6ICdmMjBkJywgJ2Nvbm5lY3RkZXZlbG9wJzogJ2YyMGUnLCAnZGFzaGN1YmUnOiAnZjIxMCcsICdmb3J1bWJlZSc6ICdmMjExJywgJ2xlYW5wdWInOiAnZjIxMicsICdzZWxsc3knOiAnZjIxMycsICdzaGlydHNpbmJ1bGsnOiAnZjIxNCcsICdzaW1wbHlidWlsdCc6ICdmMjE1JywgJ3NreWF0bGFzJzogJ2YyMTYnLCAnY2FydC1wbHVzJzogJ2YyMTcnLCAnY2FydC1hcnJvdy1kb3duJzogJ2YyMTgnLCAnZGlhbW9uZCc6ICdmMjE5JywgJ3NoaXAnOiAnZjIxYScsICd1c2VyLXNlY3JldCc6ICdmMjFiJywgJ21vdG9yY3ljbGUnOiAnZjIxYycsICdzdHJlZXQtdmlldyc6ICdmMjFkJywgJ2hlYXJ0YmVhdCc6ICdmMjFlJywgJ3ZlbnVzJzogJ2YyMjEnLCAnbWFycyc6ICdmMjIyJywgJ21lcmN1cnknOiAnZjIyMycsICdpbnRlcnNleCx0cmFuc2dlbmRlcic6ICdmMjI0JywgJ3RyYW5zZ2VuZGVyLWFsdCc6ICdmMjI1JywgJ3ZlbnVzLWRvdWJsZSc6ICdmMjI2JywgJ21hcnMtZG91YmxlJzogJ2YyMjcnLCAndmVudXMtbWFycyc6ICdmMjI4JywgJ21hcnMtc3Ryb2tlJzogJ2YyMjknLCAnbWFycy1zdHJva2Utdic6ICdmMjJhJywgJ21hcnMtc3Ryb2tlLWgnOiAnZjIyYicsICduZXV0ZXInOiAnZjIyYycsICdnZW5kZXJsZXNzJzogJ2YyMmQnLCAnZmFjZWJvb2stb2ZmaWNpYWwnOiAnZjIzMCcsICdwaW50ZXJlc3QtcCc6ICdmMjMxJywgJ3doYXRzYXBwJzogJ2YyMzInLCAnc2VydmVyJzogJ2YyMzMnLCAndXNlci1wbHVzJzogJ2YyMzQnLCAndXNlci10aW1lcyc6ICdmMjM1JywgJ2hvdGVsLGJlZCc6ICdmMjM2JywgJ3ZpYWNvaW4nOiAnZjIzNycsICd0cmFpbic6ICdmMjM4JywgJ3N1YndheSc6ICdmMjM5JywgJ21lZGl1bSc6ICdmMjNhJywgJ3ljLHktY29tYmluYXRvcic6ICdmMjNiJywgJ29wdGluLW1vbnN0ZXInOiAnZjIzYycsICdvcGVuY2FydCc6ICdmMjNkJywgJ2V4cGVkaXRlZHNzbCc6ICdmMjNlJywgJ2JhdHRlcnktNCxiYXR0ZXJ5LWZ1bGwnOiAnZjI0MCcsICdiYXR0ZXJ5LTMsYmF0dGVyeS10aHJlZS1xdWFydGVycyc6ICdmMjQxJywgJ2JhdHRlcnktMixiYXR0ZXJ5LWhhbGYnOiAnZjI0MicsICdiYXR0ZXJ5LTEsYmF0dGVyeS1xdWFydGVyJzogJ2YyNDMnLCAnYmF0dGVyeS0wLGJhdHRlcnktZW1wdHknOiAnZjI0NCcsICdtb3VzZS1wb2ludGVyJzogJ2YyNDUnLCAnaS1jdXJzb3InOiAnZjI0NicsICdvYmplY3QtZ3JvdXAnOiAnZjI0NycsICdvYmplY3QtdW5ncm91cCc6ICdmMjQ4JywgJ3N0aWNreS1ub3RlJzogJ2YyNDknLCAnc3RpY2t5LW5vdGUtbyc6ICdmMjRhJywgJ2NjLWpjYic6ICdmMjRiJywgJ2NjLWRpbmVycy1jbHViJzogJ2YyNGMnLCAnY2xvbmUnOiAnZjI0ZCcsICdiYWxhbmNlLXNjYWxlJzogJ2YyNGUnLCAnaG91cmdsYXNzLW8nOiAnZjI1MCcsICdob3VyZ2xhc3MtMSxob3VyZ2xhc3Mtc3RhcnQnOiAnZjI1MScsICdob3VyZ2xhc3MtMixob3VyZ2xhc3MtaGFsZic6ICdmMjUyJywgJ2hvdXJnbGFzcy0zLGhvdXJnbGFzcy1lbmQnOiAnZjI1MycsICdob3VyZ2xhc3MnOiAnZjI1NCcsICdoYW5kLWdyYWItbyxoYW5kLXJvY2stbyc6ICdmMjU1JywgJ2hhbmQtc3RvcC1vLGhhbmQtcGFwZXItbyc6ICdmMjU2JywgJ2hhbmQtc2Npc3NvcnMtbyc6ICdmMjU3JywgJ2hhbmQtbGl6YXJkLW8nOiAnZjI1OCcsICdoYW5kLXNwb2NrLW8nOiAnZjI1OScsICdoYW5kLXBvaW50ZXItbyc6ICdmMjVhJywgJ2hhbmQtcGVhY2Utbyc6ICdmMjViJywgJ3RyYWRlbWFyayc6ICdmMjVjJywgJ3JlZ2lzdGVyZWQnOiAnZjI1ZCcsICdjcmVhdGl2ZS1jb21tb25zJzogJ2YyNWUnLCAnZ2cnOiAnZjI2MCcsICdnZy1jaXJjbGUnOiAnZjI2MScsICd0cmlwYWR2aXNvcic6ICdmMjYyJywgJ29kbm9rbGFzc25pa2knOiAnZjI2MycsICdvZG5va2xhc3NuaWtpLXNxdWFyZSc6ICdmMjY0JywgJ2dldC1wb2NrZXQnOiAnZjI2NScsICd3aWtpcGVkaWEtdyc6ICdmMjY2JywgJ3NhZmFyaSc6ICdmMjY3JywgJ2Nocm9tZSc6ICdmMjY4JywgJ2ZpcmVmb3gnOiAnZjI2OScsICdvcGVyYSc6ICdmMjZhJywgJ2ludGVybmV0LWV4cGxvcmVyJzogJ2YyNmInLCAndHYsdGVsZXZpc2lvbic6ICdmMjZjJywgJ2NvbnRhbyc6ICdmMjZkJywgJzUwMHB4JzogJ2YyNmUnLCAnYW1hem9uJzogJ2YyNzAnLCAnY2FsZW5kYXItcGx1cy1vJzogJ2YyNzEnLCAnY2FsZW5kYXItbWludXMtbyc6ICdmMjcyJywgJ2NhbGVuZGFyLXRpbWVzLW8nOiAnZjI3MycsICdjYWxlbmRhci1jaGVjay1vJzogJ2YyNzQnLCAnaW5kdXN0cnknOiAnZjI3NScsICdtYXAtcGluJzogJ2YyNzYnLCAnbWFwLXNpZ25zJzogJ2YyNzcnLCAnbWFwLW8nOiAnZjI3OCcsICdtYXAnOiAnZjI3OScsICdjb21tZW50aW5nJzogJ2YyN2EnLCAnY29tbWVudGluZy1vJzogJ2YyN2InLCAnaG91enonOiAnZjI3YycsICd2aW1lbyc6ICdmMjdkJywgJ2JsYWNrLXRpZSc6ICdmMjdlJywgJ2ZvbnRpY29ucyc6ICdmMjgwJywgJ3JlZGRpdC1hbGllbic6ICdmMjgxJywgJ2VkZ2UnOiAnZjI4MicsICdjcmVkaXQtY2FyZC1hbHQnOiAnZjI4MycsICdjb2RpZXBpZSc6ICdmMjg0JywgJ21vZHgnOiAnZjI4NScsICdmb3J0LWF3ZXNvbWUnOiAnZjI4NicsICd1c2InOiAnZjI4NycsICdwcm9kdWN0LWh1bnQnOiAnZjI4OCcsICdtaXhjbG91ZCc6ICdmMjg5JywgJ3NjcmliZCc6ICdmMjhhJywgJ3BhdXNlLWNpcmNsZSc6ICdmMjhiJywgJ3BhdXNlLWNpcmNsZS1vJzogJ2YyOGMnLCAnc3RvcC1jaXJjbGUnOiAnZjI4ZCcsICdzdG9wLWNpcmNsZS1vJzogJ2YyOGUnLCAnc2hvcHBpbmctYmFnJzogJ2YyOTAnLCAnc2hvcHBpbmctYmFza2V0JzogJ2YyOTEnLCAnaGFzaHRhZyc6ICdmMjkyJywgJ2JsdWV0b290aCc6ICdmMjkzJywgJ2JsdWV0b290aC1iJzogJ2YyOTQnLCAncGVyY2VudCc6ICdmMjk1JywgJ2dpdGxhYic6ICdmMjk2JywgJ3dwYmVnaW5uZXInOiAnZjI5NycsICd3cGZvcm1zJzogJ2YyOTgnLCAnZW52aXJhJzogJ2YyOTknLCAndW5pdmVyc2FsLWFjY2Vzcyc6ICdmMjlhJywgJ3doZWVsY2hhaXItYWx0JzogJ2YyOWInLCAncXVlc3Rpb24tY2lyY2xlLW8nOiAnZjI5YycsICdibGluZCc6ICdmMjlkJywgJ2F1ZGlvLWRlc2NyaXB0aW9uJzogJ2YyOWUnLCAndm9sdW1lLWNvbnRyb2wtcGhvbmUnOiAnZjJhMCcsICdicmFpbGxlJzogJ2YyYTEnLCAnYXNzaXN0aXZlLWxpc3RlbmluZy1zeXN0ZW1zJzogJ2YyYTInLCAnYXNsLWludGVycHJldGluZyxhbWVyaWNhbi1zaWduLWxhbmd1YWdlLWludGVycHJldGluZyc6ICdmMmEzJywgJ2RlYWZuZXNzLGhhcmQtb2YtaGVhcmluZyxkZWFmJzogJ2YyYTQnLCAnZ2xpZGUnOiAnZjJhNScsICdnbGlkZS1nJzogJ2YyYTYnLCAnc2lnbmluZyxzaWduLWxhbmd1YWdlJzogJ2YyYTcnLCAnbG93LXZpc2lvbic6ICdmMmE4JywgJ3ZpYWRlbyc6ICdmMmE5JywgJ3ZpYWRlby1zcXVhcmUnOiAnZjJhYScsICdzbmFwY2hhdCc6ICdmMmFiJywgJ3NuYXBjaGF0LWdob3N0JzogJ2YyYWMnLCAnc25hcGNoYXQtc3F1YXJlJzogJ2YyYWQnLCAncGllZC1waXBlcic6ICdmMmFlJywgJ2ZpcnN0LW9yZGVyJzogJ2YyYjAnLCAneW9hc3QnOiAnZjJiMScsICd0aGVtZWlzbGUnOiAnZjJiMicsICdnb29nbGUtcGx1cy1jaXJjbGUsZ29vZ2xlLXBsdXMtb2ZmaWNpYWwnOiAnZjJiMycsICdmYSxmb250LWF3ZXNvbWUnOiAnZjJiNCcgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpY29uKGQpIHtcclxuICAgICAgICB2YXIgY29kZTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaWNvbk1hcCAmJiBvcHRpb25zLnNob3dJY29ucyAmJiBvcHRpb25zLmljb25zKSB7XHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXSAmJiBvcHRpb25zLmljb25NYXBbb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV1dKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gb3B0aW9ucy5pY29uTWFwW29wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dXTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmljb25NYXBbZC5sYWJlbHNbMF1dKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gb3B0aW9ucy5pY29uTWFwW2QubGFiZWxzWzBdXTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY29kZTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbWFnZShkKSB7XHJcbiAgICAgICAgdmFyIGksIGltYWdlc0ZvckxhYmVsLCBpbWcsIGltZ0xldmVsLCBsYWJlbCwgbGFiZWxQcm9wZXJ0eVZhbHVlLCBwcm9wZXJ0eSwgdmFsdWU7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmltYWdlcykge1xyXG4gICAgICAgICAgICBpbWFnZXNGb3JMYWJlbCA9IG9wdGlvbnMuaW1hZ2VNYXBbZC5sYWJlbHNbMF1dO1xyXG5cclxuICAgICAgICAgICAgaWYgKGltYWdlc0ZvckxhYmVsKSB7XHJcbiAgICAgICAgICAgICAgICBpbWdMZXZlbCA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGltYWdlc0ZvckxhYmVsLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxQcm9wZXJ0eVZhbHVlID0gaW1hZ2VzRm9yTGFiZWxbaV0uc3BsaXQoJ3wnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGQubGFiZWxzWzBdID09PSBsYWJlbCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoIXByb3BlcnR5IHx8IGQucHJvcGVydGllc1twcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCkgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCF2YWx1ZSB8fCBkLnByb3BlcnRpZXNbcHJvcGVydHldID09PSB2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGggPiBpbWdMZXZlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nID0gb3B0aW9ucy5pbWFnZXNbaW1hZ2VzRm9yTGFiZWxbaV1dO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nTGV2ZWwgPSBsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW1nO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXQoX3NlbGVjdG9yLCBfb3B0aW9ucykge1xyXG4gICAgICAgIGluaXRJY29uTWFwKCk7XHJcblxyXG4gICAgICAgIG1lcmdlKG9wdGlvbnMsIF9vcHRpb25zKTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaWNvbnMpIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5zaG93SWNvbnMgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFvcHRpb25zLm1pbkNvbGxpc2lvbikge1xyXG4gICAgICAgICAgICBvcHRpb25zLm1pbkNvbGxpc2lvbiA9IG9wdGlvbnMubm9kZVJhZGl1cyAqIDI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbml0SW1hZ2VNYXAoKTtcclxuXHJcbiAgICAgICAgc2VsZWN0b3IgPSBfc2VsZWN0b3I7XHJcblxyXG4gICAgICAgIGNvbnRhaW5lciA9IGQzLnNlbGVjdChzZWxlY3Rvcik7XHJcblxyXG4gICAgICAgIGNvbnRhaW5lci5hdHRyKCdjbGFzcycsICduZW80amQzJylcclxuICAgICAgICAgICAgLmh0bWwoJycpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pbmZvUGFuZWwpIHtcclxuICAgICAgICAgICAgaW5mbyA9IGFwcGVuZEluZm9QYW5lbChjb250YWluZXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXBwZW5kR3JhcGgoY29udGFpbmVyKTtcclxuXHJcbiAgICAgICAgc2ltdWxhdGlvbiA9IGluaXRTaW11bGF0aW9uKCk7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLm5lbzRqRGF0YSkge1xyXG4gICAgICAgICAgICBsb2FkTmVvNGpEYXRhKG9wdGlvbnMubmVvNGpEYXRhKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubmVvNGpEYXRhVXJsKSB7XHJcbiAgICAgICAgICAgIGxvYWROZW80akRhdGFGcm9tVXJsKG9wdGlvbnMubmVvNGpEYXRhVXJsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvcjogYm90aCBuZW80akRhdGEgYW5kIG5lbzRqRGF0YVVybCBhcmUgZW1wdHkhJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXRJY29uTWFwKCkge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKG9wdGlvbnMuaWNvbk1hcCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5LCBpbmRleCkge1xyXG4gICAgICAgICAgICB2YXIga2V5cyA9IGtleS5zcGxpdCgnLCcpLFxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBvcHRpb25zLmljb25NYXBba2V5XTtcclxuXHJcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmljb25NYXBba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0SW1hZ2VNYXAoKSB7XHJcbiAgICAgICAgdmFyIGtleSwga2V5cywgc2VsZWN0b3I7XHJcblxyXG4gICAgICAgIGZvciAoa2V5IGluIG9wdGlvbnMuaW1hZ2VzKSB7XHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmltYWdlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICBrZXlzID0ga2V5LnNwbGl0KCd8Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5pbWFnZU1hcFtrZXlzWzBdXSA9IFtrZXldO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dLnB1c2goa2V5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0U2ltdWxhdGlvbigpIHtcclxuICAgICAgICB2YXIgc2ltdWxhdGlvbiA9IGQzLmZvcmNlU2ltdWxhdGlvbigpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY29sbGlkZScsIGQzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cyhmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubWluQ29sbGlzaW9uO1xyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgLmZvcmNlKCdjaGFyZ2UnLCBkMy5mb3JjZU1hbnlCb2R5KCkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnbGluaycsIGQzLmZvcmNlTGluaygpLmlkKGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5pZDtcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY2VudGVyJywgZDMuZm9yY2VDZW50ZXIoc3ZnLm5vZGUoKS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQuY2xpZW50V2lkdGggLyAyLCBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5jbGllbnRIZWlnaHQgLyAyKSlcclxuICAgICAgICAgICAgLm9uKCd0aWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdGljaygpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnpvb21GaXQgJiYgIWp1c3RMb2FkZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBqdXN0TG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB6b29tRml0KDIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNpbXVsYXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YSgpIHtcclxuICAgICAgICBub2RlcyA9IFtdO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSBbXTtcclxuXHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YUZyb21VcmwobmVvNGpEYXRhVXJsKSB7XHJcbiAgICAgICAgbm9kZXMgPSBbXTtcclxuICAgICAgICByZWxhdGlvbnNoaXBzID0gW107XHJcblxyXG4gICAgICAgIGQzLmpzb24obmVvNGpEYXRhVXJsLCBmdW5jdGlvbiAoZXJyb3IsIGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtZXJnZSh0YXJnZXQsIHNvdXJjZSkge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHNvdXJjZVtwcm9wZXJ0eV07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbmVvNGpEYXRhVG9EM0RhdGEoZGF0YSkge1xyXG4gICAgICAgIHZhciBncmFwaCA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZm9yRWFjaChmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb250YWlucyhncmFwaC5ub2Rlcywgbm9kZS5pZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGgubm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMuZm9yRWFjaChmdW5jdGlvbiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb250YWlucyhncmFwaC5yZWxhdGlvbnNoaXBzLCByZWxhdGlvbnNoaXAuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5zb3VyY2UgPSByZWxhdGlvbnNoaXAuc3RhcnROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXAudGFyZ2V0ID0gcmVsYXRpb25zaGlwLmVuZE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyYXBoLnJlbGF0aW9uc2hpcHMucHVzaChyZWxhdGlvbnNoaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGEuc291cmNlID4gYi5zb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhLnNvdXJjZSA8IGIuc291cmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS50YXJnZXQgPiBiLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhLnRhcmdldCA8IGIudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09IDAgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnNvdXJjZSA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS5zb3VyY2UgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnRhcmdldCA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLmxpbmtudW0gPSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaSAtIDFdLmxpbmtudW0gKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5saW5rbnVtID0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gZ3JhcGg7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGZ1bmN0aW9uIGFwcGVuZERhdGFUb05vZGVPdXR3YXJkKHNvdXJjZU5vZGUsIG5ld05vZGVzLCBuZXdSZWxhdGlvbnNoaXBzKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHMgPSBzaXplKCksXHJcbiAgICAgICAgICAgIG1hcCA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3Tm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbm9kZSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBsYWJlbHM6IG5ld05vZGVzW2ldLmxhYmVscyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld05vZGVzW2ldLnByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICB4OiBzb3VyY2VOb2RlLngsXHJcbiAgICAgICAgICAgICAgICB5OiBzb3VyY2VOb2RlLnlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgbWFwW25ld05vZGVzW2ldLmlkXSA9IG5vZGUuaWQ7XHJcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmV3UmVsYXRpb25zaGlwcy5sZW5ndGg7IGorKykge1xyXG5cclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMucmVsYXRpb25zaGlwcyArIDEgKyBqLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogbmV3UmVsYXRpb25zaGlwc1tqXS50eXBlLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBzb3VyY2VOb2RlLmlkLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBtYXBbbmV3UmVsYXRpb25zaGlwc1tqXS5lbmROb2RlXSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG5ld1JlbGF0aW9uc2hpcHNbal0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlTm9kZS5pZCxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogbWFwW25ld1JlbGF0aW9uc2hpcHNbal0uZW5kTm9kZV0sXHJcbiAgICAgICAgICAgICAgICBsaW5rbnVtOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgalxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIFxyXG4gICAgZnVuY3Rpb24gYXBwZW5kRGF0YVRvTm9kZUlud2FyZChzb3VyY2VOb2RlLCBuZXdOb2RlcywgbmV3UmVsYXRpb25zaGlwcykge1xyXG4gICAgICAgIHZhciBkYXRhID0ge1xyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgfSxcclxuICAgICAgICAgICAgbm9kZSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwLFxyXG4gICAgICAgICAgICBzID0gc2l6ZSgpLFxyXG4gICAgICAgICAgICBtYXAgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ld05vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG5vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGFiZWxzOiBuZXdOb2Rlc1tpXS5sYWJlbHMsXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBuZXdOb2Rlc1tpXS5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgeDogc291cmNlTm9kZS54LFxyXG4gICAgICAgICAgICAgICAgeTogc291cmNlTm9kZS55XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIG1hcFtuZXdOb2Rlc1tpXS5pZF0gPSBub2RlLmlkO1xyXG4gICAgICAgICAgICBkYXRhLm5vZGVzW2RhdGEubm9kZXMubGVuZ3RoXSA9IG5vZGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmV3UmVsYXRpb25zaGlwcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5yZWxhdGlvbnNoaXBzICsgMSArIGosXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBuZXdSZWxhdGlvbnNoaXBzW2pdLnR5cGUsXHJcbiAgICAgICAgICAgICAgICBzdGFydE5vZGU6IG1hcFtuZXdSZWxhdGlvbnNoaXBzW2pdLnN0YXJ0Tm9kZV0sXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBzb3VyY2VOb2RlLmlkLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBuZXdSZWxhdGlvbnNoaXBzW2pdLnByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IG1hcFtuZXdSZWxhdGlvbnNoaXBzW2pdLnN0YXJ0Tm9kZV0sXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHNvdXJjZU5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICBsaW5rbnVtOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgalxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhKGRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJhbmRvbUQzRGF0YShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgICAgIGksXHJcbiAgICAgICAgICAgIGxhYmVsLFxyXG4gICAgICAgICAgICBub2RlLFxyXG4gICAgICAgICAgICBudW1Ob2RlcyA9IChtYXhOb2Rlc1RvR2VuZXJhdGUgKiBNYXRoLnJhbmRvbSgpIDw8IDApICsgMSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwLFxyXG4gICAgICAgICAgICBzID0gc2l6ZSgpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1Ob2RlczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxhYmVsID0gcmFuZG9tTGFiZWwoKTtcclxuXHJcbiAgICAgICAgICAgIG5vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGFiZWxzOiBbbGFiZWxdLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbTogbGFiZWxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBkLngsXHJcbiAgICAgICAgICAgICAgICB5OiBkLnlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcclxuXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IGxhYmVsLnRvVXBwZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICBzdGFydE5vZGU6IGQuaWQsXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnJvbTogRGF0ZS5ub3coKVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogZC5pZCxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGlua251bTogcy5yZWxhdGlvbnNoaXBzICsgMSArIGlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByYW5kb21MYWJlbCgpIHtcclxuICAgICAgICB2YXIgaWNvbnMgPSBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApO1xyXG4gICAgICAgIHJldHVybiBpY29uc1tpY29ucy5sZW5ndGggKiBNYXRoLnJhbmRvbSgpIDw8IDBdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZShjeCwgY3ksIHgsIHksIGFuZ2xlKSB7XHJcbiAgICAgICAgdmFyIHJhZGlhbnMgPSAoTWF0aC5QSSAvIDE4MCkgKiBhbmdsZSxcclxuICAgICAgICAgICAgY29zID0gTWF0aC5jb3MocmFkaWFucyksXHJcbiAgICAgICAgICAgIHNpbiA9IE1hdGguc2luKHJhZGlhbnMpLFxyXG4gICAgICAgICAgICBueCA9IChjb3MgKiAoeCAtIGN4KSkgKyAoc2luICogKHkgLSBjeSkpICsgY3gsXHJcbiAgICAgICAgICAgIG55ID0gKGNvcyAqICh5IC0gY3kpKSAtIChzaW4gKiAoeCAtIGN4KSkgKyBjeTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHsgeDogbngsIHk6IG55IH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlUG9pbnQoYywgcCwgYW5nbGUpIHtcclxuICAgICAgICByZXR1cm4gcm90YXRlKGMueCwgYy55LCBwLngsIHAueSwgYW5nbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0aW9uKHNvdXJjZSwgdGFyZ2V0KSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGFyZ2V0LnkgLSBzb3VyY2UueSwgdGFyZ2V0LnggLSBzb3VyY2UueCkgKiAxODAgLyBNYXRoLlBJO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNpemUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbm9kZXM6IG5vZGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogcmVsYXRpb25zaGlwcy5sZW5ndGhcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgLypcclxuICAgICAgICBmdW5jdGlvbiBzbW9vdGhUcmFuc2Zvcm0oZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSkge1xyXG4gICAgICAgICAgICB2YXIgYW5pbWF0aW9uTWlsbGlzZWNvbmRzID0gNTAwMCxcclxuICAgICAgICAgICAgICAgIHRpbWVvdXRNaWxsaXNlY29uZHMgPSA1MCxcclxuICAgICAgICAgICAgICAgIHN0ZXBzID0gcGFyc2VJbnQoYW5pbWF0aW9uTWlsbGlzZWNvbmRzIC8gdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICBcclxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgMSwgc3RlcHMpO1xyXG4gICAgICAgICAgICB9LCB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcclxuICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICBmdW5jdGlvbiBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIHN0ZXAsIHN0ZXBzKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9ncmVzcyA9IHN0ZXAgLyBzdGVwcztcclxuICAgIFxyXG4gICAgICAgICAgICBlbGVtLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArICh0cmFuc2xhdGVbMF0gKiBwcm9ncmVzcykgKyAnLCAnICsgKHRyYW5zbGF0ZVsxXSAqIHByb2dyZXNzKSArICcpIHNjYWxlKCcgKyAoc2NhbGUgKiBwcm9ncmVzcykgKyAnKScpO1xyXG4gICAgXHJcbiAgICAgICAgICAgIGlmIChzdGVwIDwgc3RlcHMpIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCBzdGVwICsgMSwgc3RlcHMpO1xyXG4gICAgICAgICAgICAgICAgfSwgdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAqL1xyXG4gICAgZnVuY3Rpb24gc3RpY2tOb2RlKGQpIHtcclxuICAgICAgICBkLmZ4ID0gZDMuZXZlbnQueDtcclxuICAgICAgICBkLmZ5ID0gZDMuZXZlbnQueTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrKCkge1xyXG4gICAgICAgIHRpY2tOb2RlcygpO1xyXG4gICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja05vZGVzKCkge1xyXG4gICAgICAgIGlmIChub2RlKSB7XHJcbiAgICAgICAgICAgIG5vZGUuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyBkLnggKyAnLCAnICsgZC55ICsgJyknO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHMoKSB7XHJcbiAgICAgICAgaWYgKHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgZC5zb3VyY2UueCArICcsICcgKyBkLnNvdXJjZS55ICsgJykgcm90YXRlKCcgKyBhbmdsZSArICcpJztcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aWNrUmVsYXRpb25zaGlwc1RleHRzKCk7XHJcbiAgICAgICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzT3V0bGluZXMoKTtcclxuICAgICAgICAgICAgdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc091dGxpbmVzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcC5lYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIHJlbCA9IGQzLnNlbGVjdCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIG91dGxpbmUgPSByZWwuc2VsZWN0KCcub3V0bGluZScpLFxyXG4gICAgICAgICAgICAgICAgdGV4dCA9IHJlbC5zZWxlY3QoJy50ZXh0Jyk7XHJcblxyXG4gICAgICAgICAgICBvdXRsaW5lLmF0dHIoJ2QnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0Qm91bmRpbmdCb3ggPSB0ZXh0Lm5vZGUoKS5nZXRCQm94KCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFBhZGRpbmcgPSA1LFxyXG4gICAgICAgICAgICAgICAgICAgIHUgPSB1bml0YXJ5VmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dE1hcmdpbiA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueCkgKiAwLjUsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtICh0ZXh0Qm91bmRpbmdCb3gud2lkdGggKyB0ZXh0UGFkZGluZykgKiB1LnkpICogMC41IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRBMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54LCB5OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogdGV4dE1hcmdpbi54LCB5OiB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LngsIHk6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEEyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QjIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggLSB1LnggKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgLSB1LnkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QzIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLnggKyAobi54IC0gdS54KSAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSArIChuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RTIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggKyAoLSBuLnggLSB1LngpICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55ICsgKC0gbi55IC0gdS55KSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRGMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRHMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIHRleHRNYXJnaW4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QTEueCArICcgJyArIHJvdGF0ZWRQb2ludEExLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QjEueCArICcgJyArIHJvdGF0ZWRQb2ludEIxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QzEueCArICcgJyArIHJvdGF0ZWRQb2ludEMxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RDEueCArICcgJyArIHJvdGF0ZWRQb2ludEQxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgWiBNICcgKyByb3RhdGVkUG9pbnRBMi54ICsgJyAnICsgcm90YXRlZFBvaW50QTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMi54ICsgJyAnICsgcm90YXRlZFBvaW50QjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMi54ICsgJyAnICsgcm90YXRlZFBvaW50QzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMi54ICsgJyAnICsgcm90YXRlZFBvaW50RDIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRFMi54ICsgJyAnICsgcm90YXRlZFBvaW50RTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRGMi54ICsgJyAnICsgcm90YXRlZFBvaW50RjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRHMi54ICsgJyAnICsgcm90YXRlZFBvaW50RzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBaJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5LmF0dHIoJ2QnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICBuMSA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG4gPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCwgNTApLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwIC0gbi54LCB5OiAwIC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSBuLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEMgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggKyBuLnggLSBuMS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSArIG4ueSAtIG4xLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RCA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgbi54IC0gbjEueCwgeTogMCArIG4ueSAtIG4xLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICdNICcgKyByb3RhdGVkUG9pbnRBLnggKyAnICcgKyByb3RhdGVkUG9pbnRBLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCLnggKyAnICcgKyByb3RhdGVkUG9pbnRCLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDLnggKyAnICcgKyByb3RhdGVkUG9pbnRDLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRELnggKyAnICcgKyByb3RhdGVkUG9pbnRELnkgK1xyXG4gICAgICAgICAgICAgICAgJyBaJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc1RleHRzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcFRleHQuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgdmFyIGFuZ2xlID0gKHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCkgKyAzNjApICUgMzYwLFxyXG4gICAgICAgICAgICAgICAgbWlycm9yID0gYW5nbGUgPiA5MCAmJiBhbmdsZSA8IDI3MCxcclxuICAgICAgICAgICAgICAgIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG5XZWlnaHQgPSBtaXJyb3IgPyAyIDogLTMsXHJcbiAgICAgICAgICAgICAgICBwb2ludCA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54KSAqIDAuNSArIG4ueCAqIG5XZWlnaHQsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSkgKiAwLjUgKyBuLnkgKiBuV2VpZ2h0IH0sXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnQgPSByb3RhdGVQb2ludChjZW50ZXIsIHBvaW50LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgcm90YXRlZFBvaW50LnggKyAnLCAnICsgcm90YXRlZFBvaW50LnkgKyAnKSByb3RhdGUoJyArIChtaXJyb3IgPyAxODAgOiAwKSArICcpJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0b1N0cmluZyhkKSB7XHJcbiAgICAgICAgdmFyIHMgPSBkLmxhYmVscyA/IGQubGFiZWxzWzBdIDogZC50eXBlO1xyXG5cclxuICAgICAgICBzICs9ICcgKDxpZD46ICcgKyBkLmlkO1xyXG5cclxuICAgICAgICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIHMgKz0gJywgJyArIHByb3BlcnR5ICsgJzogJyArIEpTT04uc3RyaW5naWZ5KGQucHJvcGVydGllc1twcm9wZXJ0eV0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzICs9ICcpJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdW5pdGFyeU5vcm1hbFZlY3Rvcihzb3VyY2UsIHRhcmdldCwgbmV3TGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICB2ZWN0b3IgPSB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpO1xyXG5cclxuICAgICAgICByZXR1cm4gcm90YXRlUG9pbnQoY2VudGVyLCB2ZWN0b3IsIDkwKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRhcmdldC54IC0gc291cmNlLngsIDIpICsgTWF0aC5wb3codGFyZ2V0LnkgLSBzb3VyY2UueSwgMikpIC8gTWF0aC5zcXJ0KG5ld0xlbmd0aCB8fCAxKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogKHRhcmdldC54IC0gc291cmNlLngpIC8gbGVuZ3RoLFxyXG4gICAgICAgICAgICB5OiAodGFyZ2V0LnkgLSBzb3VyY2UueSkgLyBsZW5ndGgsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoRDNEYXRhKGQzRGF0YSkge1xyXG4gICAgICAgIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhkM0RhdGEubm9kZXMsIGQzRGF0YS5yZWxhdGlvbnNoaXBzKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xyXG4gICAgICAgIHZhciBkM0RhdGEgPSBuZW80akRhdGFUb0QzRGF0YShuZW80akRhdGEpO1xyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZDNEYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVJbmZvKGQpIHtcclxuICAgICAgICBjbGVhckluZm8oKTtcclxuXHJcbiAgICAgICAgaWYgKGQubGFiZWxzKSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoJ2NsYXNzJywgZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50UmVsYXRpb25zaGlwKCdjbGFzcycsIGQudHlwZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsICcmbHQ7aWQmZ3Q7JywgZC5pZCk7XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKGQucHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eSgncHJvcGVydHknLCBwcm9wZXJ0eSwgSlNPTi5zdHJpbmdpZnkoZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzKG4pIHtcclxuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShub2Rlcywgbik7XHJcblxyXG4gICAgICAgIG5vZGUgPSBzdmdOb2Rlcy5zZWxlY3RBbGwoJy5ub2RlJylcclxuICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuICAgICAgICB2YXIgbm9kZUVudGVyID0gYXBwZW5kTm9kZVRvR3JhcGgoKTtcclxuICAgICAgICBub2RlID0gbm9kZUVudGVyLm1lcmdlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhuLCByKSB7XHJcbiAgICAgICAgdXBkYXRlUmVsYXRpb25zaGlwcyhyKTtcclxuICAgICAgICB1cGRhdGVOb2RlcyhuKTtcclxuXHJcbiAgICAgICAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVJlbGF0aW9uc2hpcHMocikge1xyXG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlbGF0aW9uc2hpcHMsIHIpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSBzdmdSZWxhdGlvbnNoaXBzLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCcpXHJcbiAgICAgICAgICAgIC5kYXRhKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uIChkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuXHJcbiAgICAgICAgdmFyIHJlbGF0aW9uc2hpcEVudGVyID0gYXBwZW5kUmVsYXRpb25zaGlwVG9HcmFwaCgpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSByZWxhdGlvbnNoaXBFbnRlci5yZWxhdGlvbnNoaXAubWVyZ2UocmVsYXRpb25zaGlwKTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3V0bGluZSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm91dGxpbmUnKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdXRsaW5lID0gcmVsYXRpb25zaGlwRW50ZXIub3V0bGluZS5tZXJnZShyZWxhdGlvbnNoaXBPdXRsaW5lKTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3ZlcmxheSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm92ZXJsYXknKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5ID0gcmVsYXRpb25zaGlwRW50ZXIub3ZlcmxheS5tZXJnZShyZWxhdGlvbnNoaXBPdmVybGF5KTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwVGV4dCA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLnRleHQnKTtcclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0ID0gcmVsYXRpb25zaGlwRW50ZXIudGV4dC5tZXJnZShyZWxhdGlvbnNoaXBUZXh0KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB2ZXJzaW9uKCkge1xyXG4gICAgICAgIHJldHVybiBWRVJTSU9OO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHpvb21GaXQodHJhbnNpdGlvbkR1cmF0aW9uKSB7XHJcbiAgICAgICAgdmFyIGJvdW5kcyA9IHN2Zy5ub2RlKCkuZ2V0QkJveCgpLFxyXG4gICAgICAgICAgICBwYXJlbnQgPSBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudCxcclxuICAgICAgICAgICAgZnVsbFdpZHRoID0gcGFyZW50LmNsaWVudFdpZHRoLFxyXG4gICAgICAgICAgICBmdWxsSGVpZ2h0ID0gcGFyZW50LmNsaWVudEhlaWdodCxcclxuICAgICAgICAgICAgd2lkdGggPSBib3VuZHMud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodCA9IGJvdW5kcy5oZWlnaHQsXHJcbiAgICAgICAgICAgIG1pZFggPSBib3VuZHMueCArIHdpZHRoIC8gMixcclxuICAgICAgICAgICAgbWlkWSA9IGJvdW5kcy55ICsgaGVpZ2h0IC8gMjtcclxuXHJcbiAgICAgICAgaWYgKHdpZHRoID09PSAwIHx8IGhlaWdodCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47IC8vIG5vdGhpbmcgdG8gZml0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdmdTY2FsZSA9IDAuODUgLyBNYXRoLm1heCh3aWR0aCAvIGZ1bGxXaWR0aCwgaGVpZ2h0IC8gZnVsbEhlaWdodCk7XHJcbiAgICAgICAgc3ZnVHJhbnNsYXRlID0gW2Z1bGxXaWR0aCAvIDIgLSBzdmdTY2FsZSAqIG1pZFgsIGZ1bGxIZWlnaHQgLyAyIC0gc3ZnU2NhbGUgKiBtaWRZXTtcclxuXHJcbiAgICAgICAgc3ZnLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHN2Z1RyYW5zbGF0ZVswXSArICcsICcgKyBzdmdUcmFuc2xhdGVbMV0gKyAnKSBzY2FsZSgnICsgc3ZnU2NhbGUgKyAnKScpO1xyXG4gICAgICAgIC8vICAgICAgICBzbW9vdGhUcmFuc2Zvcm0oc3ZnVHJhbnNsYXRlLCBzdmdTY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVzZXRXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xyXG4gICAgICAgIHZhciBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbihfb3B0aW9ucywgeyBuZW80akRhdGE6IG5lbzRqRGF0YSwgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQgfSk7XHJcbiAgICAgICAgaW5pdChfc2VsZWN0b3IsIG5ld09wdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUoc291cmNlTm9kZSkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSByZWxhdGlvbnNoaXBzLmZpbHRlcihmdW5jdGlvbihyZWxhdGlvbnNoaXApIHtcclxuICAgICAgICAgICAgaWYocmVsYXRpb25zaGlwLnNvdXJjZSA9PT0gc291cmNlTm9kZSB8fCByZWxhdGlvbnNoaXAudGFyZ2V0ID09PSBzb3VyY2VOb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoXCIjXCIgKyByZWxhdGlvbnNoaXAudXVpZCkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIG5vZGVzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGUgIT09IHNvdXJjZU5vZGU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGQzLnNlbGVjdChcIiNcIiArIHNvdXJjZU5vZGUudXVpZCkucmVtb3ZlKCk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGd1aWQoKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gczQoKSB7XHJcbiAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcigoMSArIE1hdGgucmFuZG9tKCkpICogMHgxMDAwMClcclxuICAgICAgICAgICAgLnRvU3RyaW5nKDE2KVxyXG4gICAgICAgICAgICAuc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gJ2cnICsgczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgczQoKSArIHM0KCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICBpbml0KF9zZWxlY3RvciwgX29wdGlvbnMpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYXBwZW5kUmFuZG9tRGF0YVRvTm9kZTogYXBwZW5kUmFuZG9tRGF0YVRvTm9kZSxcclxuICAgICAgICBuZW80akRhdGFUb0QzRGF0YTogbmVvNGpEYXRhVG9EM0RhdGEsXHJcbiAgICAgICAgcmFuZG9tRDNEYXRhOiByYW5kb21EM0RhdGEsXHJcbiAgICAgICAgc2l6ZTogc2l6ZSxcclxuICAgICAgICB1cGRhdGVXaXRoRDNEYXRhOiB1cGRhdGVXaXRoRDNEYXRhLFxyXG4gICAgICAgIHVwZGF0ZVdpdGhOZW80akRhdGE6IHVwZGF0ZVdpdGhOZW80akRhdGEsXHJcbiAgICAgICAgYXBwZW5kRGF0YVRvTm9kZU91dHdhcmQ6IGFwcGVuZERhdGFUb05vZGVPdXR3YXJkLFxyXG4gICAgICAgIGFwcGVuZERhdGFUb05vZGVJbndhcmQ6IGFwcGVuZERhdGFUb05vZGVJbndhcmQsXHJcbiAgICAgICAgcmVzZXRXaXRoTmVvNGpEYXRhOiByZXNldFdpdGhOZW80akRhdGEsXHJcbiAgICAgICAgcmVtb3ZlTm9kZTogcmVtb3ZlTm9kZSxcclxuICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uXHJcbiAgICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE5lbzRqRDM7XHJcbiJdfQ==
