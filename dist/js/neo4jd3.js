(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
    var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay, relationshipText, relationships, relationshipsCopy, selector, simulation, svg, svgNodes, svgRelationships, svgScale, svgTranslate,
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

    // function appendImageToNode(node) {
    //     return node.append('image')
    //         .attr('height', function (d) {
    //             return icon(d) ? '24px' : '30px';
    //         })
    //         .attr('x', function (d) {
    //             return icon(d) ? '5px' : '-15px';
    //         })
    //         .attr('xlink:href', function (d) {
    //             return 'https://twemoji.maxcdn.com/36x36/2795.png';
    //         })
    //         .attr('y', function (d) {
    //             return icon(d) ? '5px' : '-16px';
    //         })
    //         .attr('width', function (d) {
    //             return icon(d) ? '24px' : '30px';
    //         });
    // }

    function appendImageToNode(node) {
        return node.append('image')
            .attr('height', '24px')
            .attr('x', '5px')
            .attr('y', '5px')
            .attr('width', '24px');
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
            .attr('id', function (d) {
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
                return classes;
            })
            .on('click', function (d) {
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
        appendImageToNode(n);

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
            .attr('id', function (d) {
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

        relationshipsCopy = relationships.map(function (a) {
            return Object.assign({}, a);
        });
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
        updateNodesAndRelationships(d3Data.nodes, d3Data.relationships, true);
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

    function updateNodes(n, append) {
        if (append) {
            Array.prototype.push.apply(nodes, n);
        }

        node = svgNodes.selectAll('.node')
            .data(nodes, function (d) { return d.id; });
        var nodeEnter = appendNodeToGraph();
        node = nodeEnter.merge(node);
    }

    function updateNodesAndRelationships(n, r, append) {
        updateRelationships(r, append);
        updateNodes(n, append);

        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function updateRelationships(r, append) {
        if (append) {
            Array.prototype.push.apply(relationships, r);
        }

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

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return 'g' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    init(_selector, _options);

    function createViews(keys) {
        d3.selectAll(".views").remove();
        var circles = d3.select('svg').selectAll('rect.views').data(keys);
        var r = 20;
        circles.enter().append('rect').classed('views', true)
            .attr('x', r)
            .attr('y', function (node) {
                return (keys.indexOf(node) + 1) * 2.2 * r + 27;
            })
            .attr('rx', r / 3)
            .attr('rx', r / 3)
            .attr('width', r * 4)
            .attr('height', r)
            .attr('fill', function (node) {
                return colors()[keys.indexOf(node) + 1];
            })
            .attr('stroke', function (node) {
                return "#000000";
            })
            .attr('stroke-width', function (node) {
                return "0.5px";
            })
            .attr("cursor", "pointer")
            .on('click', function (n) {
                if (typeof options.onViewsClickHandler === 'function') {
                    options.onViewsClickHandler(n);
                }
            })
            .on('mouseover', function (n) {
                if (typeof options.onViewsMouseOverHandler === 'function') {
                    options.onViewsMouseOverHandler(n);
                }
            }).on('mouseleave', function (n) {
                if (typeof options.onViewsMouseLeaveHandler === 'function') {
                    options.onViewsMouseLeaveHandler(n);
                }
            });

        var text = d3.select('svg').selectAll('text.views').data(keys);
        text.enter().append('text').classed('views', true)
            .attr('text-anchor', 'left')
            .attr('font-weight', 'bold')
            .attr('stroke-width', '0')
            .attr('stroke-color', 'white')
            .attr('fill', '#696969')
            .attr('x', 2 * r)
            .attr('font-size', "10px")
            .attr("cursor", "pointer")
            .text(function (node) {
                return node;
            }).attr('y', function (node) {
                return (keys.indexOf(node) + 1) * 2.2 * r + 40;
            })
            .on('click', function (n) {
                if (typeof options.onViewsClickHandler === 'function') {
                    options.onViewsClickHandler(n);
                }
            })
            .on('mouseover', function (n) {
                if (typeof options.onViewsMouseOverHandler === 'function') {
                    options.onViewsMouseOverHandler(n);
                }
            })
            .on('mouseleave', function (n) {
                if (typeof options.onViewsMouseLeaveHandler === 'function') {
                    options.onViewsMouseLeaveHandler(n);
                }
            });
        return circles.exit().remove();
    }

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

        var priority = 0;
        var x = 700;
        var y = 200;

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

        var priority = 0;
        var x = 700;
        var y = 200;

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

        var data = {
            nodes: [],
            relationships: []
        };

        var s = size();

        currentNode.previous.forEach(function (n, i) {
            // Create new node
            var node = {
                id: n.node.id,
                labels: n.node.labels,
                properties: n.node.properties,
                x: currentNode.x + 90,
                y: currentNode.y + 90,
                fx: currentNode.fx + 90,
                fy: currentNode.fy + 90,
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

            var links = relationshipsCopy.filter(function (link) {
                return link.source.id === node.id || link.target.id === node.id;
            });

            // Get links of the parent node
            var parentLinks = relationships.filter(function (link) {
                return link.source === currentNode || link.target === currentNode;
            });

            // Update the links to the newly created node
            links.forEach(function (link) {
                var parentLink = parentLinks.find(function (p) {
                    return p.id === link.id;
                });

                if (parentLink) {
                    if (link.source.id === node.id) {
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

        var links = relationships.filter(function (link) {
            return link.source === node || link.target === node;
        });

        var parentLink = links.find(function (link) {
            return rules.link.includes(link.type.toLowerCase())  && link.target.labels[0].toLowerCase() === rules[node.labels[0].toLowerCase()];
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
                link.startNode = parentLink.target.id;
            } else {
                link.target = parentLink.target;
                link.endNode = parentLink.target.id;
            }
        });

        removeNode(node);
    }
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
        createViews: createViews,
        highlightNodes: highlightNodes,
        unHighlightNodes: unHighlightNodes,
        orientForceGraphVertical: orientForceGraphVertical,
        orientForceGraphHorizontal: orientForceGraphHorizontal,
        getGraph: getGraph,
        collapseNode: collapseNode,
        expandNode: expandNode,
        version: version
    };
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5lbzRqZDMgPSByZXF1aXJlKCcuL3NjcmlwdHMvbmVvNGpkMycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5lbzRqZDM7XG4iLCIvKiBnbG9iYWwgZDMsIGRvY3VtZW50ICovXHJcbi8qIGpzaGludCBsYXRlZGVmOm5vZnVuYyAqL1xyXG4ndXNlIHN0cmljdCc7XHJcblxyXG5mdW5jdGlvbiBOZW80akQzKF9zZWxlY3RvciwgX29wdGlvbnMpIHtcclxuICAgIHZhciBjb250YWluZXIsIGdyYXBoLCBpbmZvLCBub2RlLCBub2RlcywgcmVsYXRpb25zaGlwLCByZWxhdGlvbnNoaXBPdXRsaW5lLCByZWxhdGlvbnNoaXBPdmVybGF5LCByZWxhdGlvbnNoaXBUZXh0LCByZWxhdGlvbnNoaXBzLCByZWxhdGlvbnNoaXBzQ29weSwgc2VsZWN0b3IsIHNpbXVsYXRpb24sIHN2Zywgc3ZnTm9kZXMsIHN2Z1JlbGF0aW9uc2hpcHMsIHN2Z1NjYWxlLCBzdmdUcmFuc2xhdGUsXHJcbiAgICAgICAgY2xhc3NlczJjb2xvcnMgPSB7fSxcclxuICAgICAgICBqdXN0TG9hZGVkID0gZmFsc2UsXHJcbiAgICAgICAgbnVtQ2xhc3NlcyA9IDAsXHJcbiAgICAgICAgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgYXJyb3dTaXplOiA0LFxyXG4gICAgICAgICAgICBjb2xvcnM6IGNvbG9ycygpLFxyXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgaWNvbk1hcDogZm9udEF3ZXNvbWVJY29ucygpLFxyXG4gICAgICAgICAgICBpY29uczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbWFnZU1hcDoge30sXHJcbiAgICAgICAgICAgIGltYWdlczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBpbmZvUGFuZWw6IHRydWUsXHJcbiAgICAgICAgICAgIG1pbkNvbGxpc2lvbjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBuZW80akRhdGE6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbmVvNGpEYXRhVXJsOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVPdXRsaW5lRmlsbENvbG9yOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5vZGVSYWRpdXM6IDI1LFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBDb2xvcjogJyNhNWFiYjYnLFxyXG4gICAgICAgICAgICB6b29tRml0OiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgVkVSU0lPTiA9ICcwLjAuMSc7XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kR3JhcGgoY29udGFpbmVyKSB7XHJcbiAgICAgICAgc3ZnID0gY29udGFpbmVyLmFwcGVuZCgnc3ZnJylcclxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnbmVvNGpkMy1ncmFwaCcpXHJcbiAgICAgICAgICAgIC5jYWxsKGQzLnpvb20oKS5vbignem9vbScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IGQzLmV2ZW50LnRyYW5zZm9ybS5rLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSA9IFtkMy5ldmVudC50cmFuc2Zvcm0ueCwgZDMuZXZlbnQudHJhbnNmb3JtLnldO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdmdUcmFuc2xhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGVbMF0gKz0gc3ZnVHJhbnNsYXRlWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZVsxXSArPSBzdmdUcmFuc2xhdGVbMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN2Z1NjYWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gc3ZnU2NhbGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgc3ZnLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRyYW5zbGF0ZVswXSArICcsICcgKyB0cmFuc2xhdGVbMV0gKyAnKSBzY2FsZSgnICsgc2NhbGUgKyAnKScpO1xyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgLm9uKCdkYmxjbGljay56b29tJywgbnVsbClcclxuICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICcxMDAlJyk7XHJcblxyXG4gICAgICAgIHN2Z1JlbGF0aW9uc2hpcHMgPSBzdmcuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JlbGF0aW9uc2hpcHMnKTtcclxuXHJcbiAgICAgICAgc3ZnTm9kZXMgPSBzdmcuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZnVuY3Rpb24gYXBwZW5kSW1hZ2VUb05vZGUobm9kZSkge1xyXG4gICAgLy8gICAgIHJldHVybiBub2RlLmFwcGVuZCgnaW1hZ2UnKVxyXG4gICAgLy8gICAgICAgICAuYXR0cignaGVpZ2h0JywgZnVuY3Rpb24gKGQpIHtcclxuICAgIC8vICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzI0cHgnIDogJzMwcHgnO1xyXG4gICAgLy8gICAgICAgICB9KVxyXG4gICAgLy8gICAgICAgICAuYXR0cigneCcsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAvLyAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/ICc1cHgnIDogJy0xNXB4JztcclxuICAgIC8vICAgICAgICAgfSlcclxuICAgIC8vICAgICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuICdodHRwczovL3R3ZW1vamkubWF4Y2RuLmNvbS8zNngzNi8yNzk1LnBuZyc7XHJcbiAgICAvLyAgICAgICAgIH0pXHJcbiAgICAvLyAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24gKGQpIHtcclxuICAgIC8vICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCcgOiAnLTE2cHgnO1xyXG4gICAgLy8gICAgICAgICB9KVxyXG4gICAgLy8gICAgICAgICAuYXR0cignd2lkdGgnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAnMjRweCcgOiAnMzBweCc7XHJcbiAgICAvLyAgICAgICAgIH0pO1xyXG4gICAgLy8gfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEltYWdlVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2ltYWdlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsICcyNHB4JylcclxuICAgICAgICAgICAgLmF0dHIoJ3gnLCAnNXB4JylcclxuICAgICAgICAgICAgLmF0dHIoJ3knLCAnNXB4JylcclxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzI0cHgnKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lci5hcHBlbmQoJ2RpdicpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICduZW80amQzLWluZm8nKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGlzTm9kZSwgcHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIGVsZW0gPSBpbmZvLmFwcGVuZCgnYScpO1xyXG5cclxuICAgICAgICBlbGVtLmF0dHIoJ2hyZWYnLCAnIycpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGNscylcclxuICAgICAgICAgICAgLmh0bWwoJzxzdHJvbmc+JyArIHByb3BlcnR5ICsgJzwvc3Ryb25nPicgKyAodmFsdWUgPyAoJzogJyArIHZhbHVlKSA6ICcnKSk7XHJcblxyXG4gICAgICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgICAgICAgZWxlbS5zdHlsZSgnYmFja2dyb3VuZC1jb2xvcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiAoaXNOb2RlID8gY2xhc3MyY29sb3IocHJvcGVydHkpIDogZGVmYXVsdENvbG9yKCkpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnN0eWxlKCdib3JkZXItY29sb3InLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiAoaXNOb2RlID8gY2xhc3MyZGFya2VuQ29sb3IocHJvcGVydHkpIDogZGVmYXVsdERhcmtlbkNvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnY29sb3InLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiAnI2ZmZic7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRDbGFzcyhjbHMsIG5vZGUpIHtcclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIHRydWUsIG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50UHJvcGVydHkoY2xzLCBwcm9wZXJ0eSwgdmFsdWUpIHtcclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGZhbHNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50UmVsYXRpb25zaGlwKGNscywgcmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCBmYWxzZSwgcmVsYXRpb25zaGlwKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRDb250ZXh0TWVudShub2RlLCBpbmRleCkge1xyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgY29udGFpbmVyIGZvciB0aGUgY29udGV4dCBtZW51XHJcbiAgICAgICAgZDMuc2VsZWN0QWxsKCcuY29udGV4dC1tZW51JykuZGF0YShbMV0pXHJcbiAgICAgICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2RpdicpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdjb250ZXh0LW1lbnUnKTtcclxuXHJcbiAgICAgICAgLy8gSGlkZSB0aGUgY29udGV4dC1tZW51IGlmIGl0IGdvZXMgb3V0IG9mIGZvY3VzIFxyXG4gICAgICAgIGQzLnNlbGVjdCgnYm9keScpLm9uKCdjbGljay5jb250ZXh0LW1lbnUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGQzLnNlbGVjdCgnLmNvbnRleHQtbWVudScpLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQXBwZW5kIGRhdGEgdG8gdGhlIGNvbnRleHQgbWVudVxyXG4gICAgICAgIGQzLnNlbGVjdEFsbCgnLmNvbnRleHQtbWVudScpXHJcbiAgICAgICAgICAgIC5odG1sKCcnKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCd1bCcpXHJcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoJ2xpJylcclxuICAgICAgICAgICAgLmRhdGEob3B0aW9ucy5jb250ZXh0TWVudSlcclxuICAgICAgICAgICAgLmVudGVyKClcclxuICAgICAgICAgICAgLmFwcGVuZCgnbGknKVxyXG4gICAgICAgICAgICAub24oJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5oYW5kbGVyKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KCcuY29udGV4dC1tZW51Jykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdpJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkLmljb247XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIgXCIgKyBkLnRleHQ7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTaG93IHRoZSBjb250ZXh0IG1lbnVcclxuICAgICAgICBkMy5zZWxlY3QoJy5jb250ZXh0LW1lbnUnKVxyXG4gICAgICAgICAgICAuc3R5bGUoJ2xlZnQnLCAoZDMuZXZlbnQucGFnZVggLSAyKSArICdweCcpXHJcbiAgICAgICAgICAgIC5zdHlsZSgndG9wJywgKGQzLmV2ZW50LnBhZ2VZIC0gMikgKyAncHgnKVxyXG4gICAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnYmxvY2snKTtcclxuICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE5vZGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuZW50ZXIoKVxyXG4gICAgICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAgICAgLm9uKCdjb250ZXh0bWVudScsIGFwcGVuZENvbnRleHRNZW51KVxyXG4gICAgICAgICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgZC51dWlkID0gZ3VpZCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQudXVpZDtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBoaWdobGlnaHQsIGksXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyA9ICdub2RlJyxcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbCA9IGQubGFiZWxzWzBdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpY29uKGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaWNvbic7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGltYWdlKGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaW1hZ2UnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsYXNzZXM7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVDbGljayhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uIChkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVEb3VibGVDbGljayhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlSW5mbyhkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlTW91c2VFbnRlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlTW91c2VFbnRlcihkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24gKGQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlTW91c2VMZWF2ZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlTW91c2VMZWF2ZShkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhbGwoZDMuZHJhZygpXHJcbiAgICAgICAgICAgICAgICAub24oJ3N0YXJ0JywgZHJhZ1N0YXJ0ZWQpXHJcbiAgICAgICAgICAgICAgICAub24oJ2RyYWcnLCBkcmFnZ2VkKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdlbmQnLCBkcmFnRW5kZWQpKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmROb2RlVG9HcmFwaCgpIHtcclxuICAgICAgICB2YXIgbiA9IGFwcGVuZE5vZGUoKTtcclxuXHJcbiAgICAgICAgYXBwZW5kUmluZ1RvTm9kZShuKTtcclxuICAgICAgICBhcHBlbmRPdXRsaW5lVG9Ob2RlKG4pO1xyXG4gICAgICAgIGFwcGVuZFRleHRUb05vZGUobik7XHJcbiAgICAgICAgYXBwZW5kSW1hZ2VUb05vZGUobik7XHJcblxyXG4gICAgICAgIHJldHVybiBuO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE91dGxpbmVUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ291dGxpbmUnKVxyXG4gICAgICAgICAgICAuYXR0cigncicsIG9wdGlvbnMubm9kZVJhZGl1cylcclxuICAgICAgICAgICAgLnN0eWxlKCdmaWxsJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA6IGNsYXNzMmNvbG9yKGQubGFiZWxzWzBdKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0eWxlKCdzdHJva2UnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6IGNsYXNzMmRhcmtlbkNvbG9yKGQubGFiZWxzWzBdKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9TdHJpbmcoZCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFJpbmdUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JpbmcnKVxyXG4gICAgICAgICAgICAuYXR0cigncicsIG9wdGlvbnMubm9kZVJhZGl1cyAqIDEuMTYpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ3RpdGxlJykudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nKGQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRUZXh0VG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQucHJvcGVydGllcy5uYW1lO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjMDAwMDAwJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/IChvcHRpb25zLm5vZGVSYWRpdXMgKyAncHgnKSA6ICcxMHB4JztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxyXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcclxuICAgICAgICAgICAgLmF0dHIoJ3knLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAocGFyc2VJbnQoTWF0aC5yb3VuZChvcHRpb25zLm5vZGVSYWRpdXMgKiAwLjMyKSkgKyAncHgnKSA6ICc0cHgnO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSkge1xyXG4gICAgICAgIHZhciBkYXRhID0gcmFuZG9tRDNEYXRhKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSk7XHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSZWxhdGlvbnNoaXAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uc2hpcC5lbnRlcigpXHJcbiAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAuYXR0cignaWQnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgZC51dWlkID0gZ3VpZCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQudXVpZDtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JlbGF0aW9uc2hpcCcpXHJcbiAgICAgICAgICAgIC5vbignZGJsY2xpY2snLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uUmVsYXRpb25zaGlwRG91YmxlQ2xpY2sgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uUmVsYXRpb25zaGlwRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE91dGxpbmVUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCdwYXRoJylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ291dGxpbmUnKVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjYTVhYmI2JylcclxuICAgICAgICAgICAgLmF0dHIoJ3N0cm9rZScsICdub25lJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kT3ZlcmxheVRvUmVsYXRpb25zaGlwKHIpIHtcclxuICAgICAgICByZXR1cm4gci5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnb3ZlcmxheScpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFRleHRUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RleHQnKVxyXG4gICAgICAgICAgICAuYXR0cignZmlsbCcsICcjMDAwMDAwJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtc2l6ZScsICc4cHgnKVxyXG4gICAgICAgICAgICAuYXR0cigncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXHJcbiAgICAgICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxyXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGQudHlwZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwVG9HcmFwaCgpIHtcclxuICAgICAgICB2YXIgcmVsYXRpb25zaGlwID0gYXBwZW5kUmVsYXRpb25zaGlwKCksXHJcbiAgICAgICAgICAgIHRleHQgPSBhcHBlbmRUZXh0VG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKSxcclxuICAgICAgICAgICAgb3V0bGluZSA9IGFwcGVuZE91dGxpbmVUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApLFxyXG4gICAgICAgICAgICBvdmVybGF5ID0gYXBwZW5kT3ZlcmxheVRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG91dGxpbmU6IG91dGxpbmUsXHJcbiAgICAgICAgICAgIG92ZXJsYXk6IG92ZXJsYXksXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcDogcmVsYXRpb25zaGlwLFxyXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjbGFzczJjb2xvcihjbHMpIHtcclxuICAgICAgICB2YXIgY29sb3IgPSBjbGFzc2VzMmNvbG9yc1tjbHNdO1xyXG5cclxuICAgICAgICBpZiAoIWNvbG9yKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgY29sb3IgPSBvcHRpb25zLmNvbG9yc1tNYXRoLm1pbihudW1DbGFzc2VzLCBvcHRpb25zLmNvbG9ycy5sZW5ndGggLSAxKV07XHJcbiAgICAgICAgICAgIGNvbG9yID0gb3B0aW9ucy5jb2xvcnNbbnVtQ2xhc3NlcyAlIG9wdGlvbnMuY29sb3JzLmxlbmd0aF07XHJcbiAgICAgICAgICAgIGNsYXNzZXMyY29sb3JzW2Nsc10gPSBjb2xvcjtcclxuICAgICAgICAgICAgbnVtQ2xhc3NlcysrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNvbG9yO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNsYXNzMmRhcmtlbkNvbG9yKGNscykge1xyXG4gICAgICAgIHJldHVybiBkMy5yZ2IoY2xhc3MyY29sb3IoY2xzKSkuZGFya2VyKDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNsZWFySW5mbygpIHtcclxuICAgICAgICBpbmZvLmh0bWwoJycpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbG9ycygpIHtcclxuICAgICAgICAvLyBkMy5zY2hlbWVDYXRlZ29yeTEwLFxyXG4gICAgICAgIC8vIGQzLnNjaGVtZUNhdGVnb3J5MjAsXHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgJyM2OGJkZjYnLCAvLyBsaWdodCBibHVlXHJcbiAgICAgICAgICAgICcjNmRjZTllJywgLy8gZ3JlZW4gIzFcclxuICAgICAgICAgICAgJyNmYWFmYzInLCAvLyBsaWdodCBwaW5rXHJcbiAgICAgICAgICAgICcjZjJiYWY2JywgLy8gcHVycGxlXHJcbiAgICAgICAgICAgICcjZmY5MjhjJywgLy8gbGlnaHQgcmVkXHJcbiAgICAgICAgICAgICcjZmNlYTdlJywgLy8gbGlnaHQgeWVsbG93XHJcbiAgICAgICAgICAgICcjZmZjNzY2JywgLy8gbGlnaHQgb3JhbmdlXHJcbiAgICAgICAgICAgICcjNDA1ZjllJywgLy8gbmF2eSBibHVlXHJcbiAgICAgICAgICAgICcjYTVhYmI2JywgLy8gZGFyayBncmF5XHJcbiAgICAgICAgICAgICcjNzhjZWNiJywgLy8gZ3JlZW4gIzIsXHJcbiAgICAgICAgICAgICcjYjg4Y2JiJywgLy8gZGFyayBwdXJwbGVcclxuICAgICAgICAgICAgJyNjZWQyZDknLCAvLyBsaWdodCBncmF5XHJcbiAgICAgICAgICAgICcjZTg0NjQ2JywgLy8gZGFyayByZWRcclxuICAgICAgICAgICAgJyNmYTVmODYnLCAvLyBkYXJrIHBpbmtcclxuICAgICAgICAgICAgJyNmZmFiMWEnLCAvLyBkYXJrIG9yYW5nZVxyXG4gICAgICAgICAgICAnI2ZjZGExOScsIC8vIGRhcmsgeWVsbG93XHJcbiAgICAgICAgICAgICcjNzk3YjgwJywgLy8gYmxhY2tcclxuICAgICAgICAgICAgJyNjOWQ5NmYnLCAvLyBwaXN0YWNjaGlvXHJcbiAgICAgICAgICAgICcjNDc5OTFmJywgLy8gZ3JlZW4gIzNcclxuICAgICAgICAgICAgJyM3MGVkZWUnLCAvLyB0dXJxdW9pc2VcclxuICAgICAgICAgICAgJyNmZjc1ZWEnICAvLyBwaW5rXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb250YWlucyhhcnJheSwgaWQpIHtcclxuICAgICAgICB2YXIgZmlsdGVyID0gYXJyYXkuZmlsdGVyKGZ1bmN0aW9uIChlbGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtLmlkID09PSBpZDtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZpbHRlci5sZW5ndGggPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlZmF1bHRDb2xvcigpIHtcclxuICAgICAgICByZXR1cm4gb3B0aW9ucy5yZWxhdGlvbnNoaXBDb2xvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWZhdWx0RGFya2VuQ29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIGQzLnJnYihvcHRpb25zLmNvbG9yc1tvcHRpb25zLmNvbG9ycy5sZW5ndGggLSAxXSkuZGFya2VyKDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdFbmRlZChkKSB7XHJcbiAgICAgICAgaWYgKCFkMy5ldmVudC5hY3RpdmUpIHtcclxuICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVEcmFnRW5kID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ0VuZChkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhZ2dlZChkKSB7XHJcbiAgICAgICAgc3RpY2tOb2RlKGQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdTdGFydGVkKGQpIHtcclxuICAgICAgICBpZiAoIWQzLmV2ZW50LmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuMykucmVzdGFydCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZC5meCA9IGQueDtcclxuICAgICAgICBkLmZ5ID0gZC55O1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ1N0YXJ0KGQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBleHRlbmQob2JqMSwgb2JqMikge1xyXG4gICAgICAgIHZhciBvYmogPSB7fTtcclxuXHJcbiAgICAgICAgbWVyZ2Uob2JqLCBvYmoxKTtcclxuICAgICAgICBtZXJnZShvYmosIG9iajIpO1xyXG5cclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZvbnRBd2Vzb21lSWNvbnMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgJ2dsYXNzJzogJ2YwMDAnLCAnbXVzaWMnOiAnZjAwMScsICdzZWFyY2gnOiAnZjAwMicsICdlbnZlbG9wZS1vJzogJ2YwMDMnLCAnaGVhcnQnOiAnZjAwNCcsICdzdGFyJzogJ2YwMDUnLCAnc3Rhci1vJzogJ2YwMDYnLCAndXNlcic6ICdmMDA3JywgJ2ZpbG0nOiAnZjAwOCcsICd0aC1sYXJnZSc6ICdmMDA5JywgJ3RoJzogJ2YwMGEnLCAndGgtbGlzdCc6ICdmMDBiJywgJ2NoZWNrJzogJ2YwMGMnLCAncmVtb3ZlLGNsb3NlLHRpbWVzJzogJ2YwMGQnLCAnc2VhcmNoLXBsdXMnOiAnZjAwZScsICdzZWFyY2gtbWludXMnOiAnZjAxMCcsICdwb3dlci1vZmYnOiAnZjAxMScsICdzaWduYWwnOiAnZjAxMicsICdnZWFyLGNvZyc6ICdmMDEzJywgJ3RyYXNoLW8nOiAnZjAxNCcsICdob21lJzogJ2YwMTUnLCAnZmlsZS1vJzogJ2YwMTYnLCAnY2xvY2stbyc6ICdmMDE3JywgJ3JvYWQnOiAnZjAxOCcsICdkb3dubG9hZCc6ICdmMDE5JywgJ2Fycm93LWNpcmNsZS1vLWRvd24nOiAnZjAxYScsICdhcnJvdy1jaXJjbGUtby11cCc6ICdmMDFiJywgJ2luYm94JzogJ2YwMWMnLCAncGxheS1jaXJjbGUtbyc6ICdmMDFkJywgJ3JvdGF0ZS1yaWdodCxyZXBlYXQnOiAnZjAxZScsICdyZWZyZXNoJzogJ2YwMjEnLCAnbGlzdC1hbHQnOiAnZjAyMicsICdsb2NrJzogJ2YwMjMnLCAnZmxhZyc6ICdmMDI0JywgJ2hlYWRwaG9uZXMnOiAnZjAyNScsICd2b2x1bWUtb2ZmJzogJ2YwMjYnLCAndm9sdW1lLWRvd24nOiAnZjAyNycsICd2b2x1bWUtdXAnOiAnZjAyOCcsICdxcmNvZGUnOiAnZjAyOScsICdiYXJjb2RlJzogJ2YwMmEnLCAndGFnJzogJ2YwMmInLCAndGFncyc6ICdmMDJjJywgJ2Jvb2snOiAnZjAyZCcsICdib29rbWFyayc6ICdmMDJlJywgJ3ByaW50JzogJ2YwMmYnLCAnY2FtZXJhJzogJ2YwMzAnLCAnZm9udCc6ICdmMDMxJywgJ2JvbGQnOiAnZjAzMicsICdpdGFsaWMnOiAnZjAzMycsICd0ZXh0LWhlaWdodCc6ICdmMDM0JywgJ3RleHQtd2lkdGgnOiAnZjAzNScsICdhbGlnbi1sZWZ0JzogJ2YwMzYnLCAnYWxpZ24tY2VudGVyJzogJ2YwMzcnLCAnYWxpZ24tcmlnaHQnOiAnZjAzOCcsICdhbGlnbi1qdXN0aWZ5JzogJ2YwMzknLCAnbGlzdCc6ICdmMDNhJywgJ2RlZGVudCxvdXRkZW50JzogJ2YwM2InLCAnaW5kZW50JzogJ2YwM2MnLCAndmlkZW8tY2FtZXJhJzogJ2YwM2QnLCAncGhvdG8saW1hZ2UscGljdHVyZS1vJzogJ2YwM2UnLCAncGVuY2lsJzogJ2YwNDAnLCAnbWFwLW1hcmtlcic6ICdmMDQxJywgJ2FkanVzdCc6ICdmMDQyJywgJ3RpbnQnOiAnZjA0MycsICdlZGl0LHBlbmNpbC1zcXVhcmUtbyc6ICdmMDQ0JywgJ3NoYXJlLXNxdWFyZS1vJzogJ2YwNDUnLCAnY2hlY2stc3F1YXJlLW8nOiAnZjA0NicsICdhcnJvd3MnOiAnZjA0NycsICdzdGVwLWJhY2t3YXJkJzogJ2YwNDgnLCAnZmFzdC1iYWNrd2FyZCc6ICdmMDQ5JywgJ2JhY2t3YXJkJzogJ2YwNGEnLCAncGxheSc6ICdmMDRiJywgJ3BhdXNlJzogJ2YwNGMnLCAnc3RvcCc6ICdmMDRkJywgJ2ZvcndhcmQnOiAnZjA0ZScsICdmYXN0LWZvcndhcmQnOiAnZjA1MCcsICdzdGVwLWZvcndhcmQnOiAnZjA1MScsICdlamVjdCc6ICdmMDUyJywgJ2NoZXZyb24tbGVmdCc6ICdmMDUzJywgJ2NoZXZyb24tcmlnaHQnOiAnZjA1NCcsICdwbHVzLWNpcmNsZSc6ICdmMDU1JywgJ21pbnVzLWNpcmNsZSc6ICdmMDU2JywgJ3RpbWVzLWNpcmNsZSc6ICdmMDU3JywgJ2NoZWNrLWNpcmNsZSc6ICdmMDU4JywgJ3F1ZXN0aW9uLWNpcmNsZSc6ICdmMDU5JywgJ2luZm8tY2lyY2xlJzogJ2YwNWEnLCAnY3Jvc3NoYWlycyc6ICdmMDViJywgJ3RpbWVzLWNpcmNsZS1vJzogJ2YwNWMnLCAnY2hlY2stY2lyY2xlLW8nOiAnZjA1ZCcsICdiYW4nOiAnZjA1ZScsICdhcnJvdy1sZWZ0JzogJ2YwNjAnLCAnYXJyb3ctcmlnaHQnOiAnZjA2MScsICdhcnJvdy11cCc6ICdmMDYyJywgJ2Fycm93LWRvd24nOiAnZjA2MycsICdtYWlsLWZvcndhcmQsc2hhcmUnOiAnZjA2NCcsICdleHBhbmQnOiAnZjA2NScsICdjb21wcmVzcyc6ICdmMDY2JywgJ3BsdXMnOiAnZjA2NycsICdtaW51cyc6ICdmMDY4JywgJ2FzdGVyaXNrJzogJ2YwNjknLCAnZXhjbGFtYXRpb24tY2lyY2xlJzogJ2YwNmEnLCAnZ2lmdCc6ICdmMDZiJywgJ2xlYWYnOiAnZjA2YycsICdmaXJlJzogJ2YwNmQnLCAnZXllJzogJ2YwNmUnLCAnZXllLXNsYXNoJzogJ2YwNzAnLCAnd2FybmluZyxleGNsYW1hdGlvbi10cmlhbmdsZSc6ICdmMDcxJywgJ3BsYW5lJzogJ2YwNzInLCAnY2FsZW5kYXInOiAnZjA3MycsICdyYW5kb20nOiAnZjA3NCcsICdjb21tZW50JzogJ2YwNzUnLCAnbWFnbmV0JzogJ2YwNzYnLCAnY2hldnJvbi11cCc6ICdmMDc3JywgJ2NoZXZyb24tZG93bic6ICdmMDc4JywgJ3JldHdlZXQnOiAnZjA3OScsICdzaG9wcGluZy1jYXJ0JzogJ2YwN2EnLCAnZm9sZGVyJzogJ2YwN2InLCAnZm9sZGVyLW9wZW4nOiAnZjA3YycsICdhcnJvd3Mtdic6ICdmMDdkJywgJ2Fycm93cy1oJzogJ2YwN2UnLCAnYmFyLWNoYXJ0LW8sYmFyLWNoYXJ0JzogJ2YwODAnLCAndHdpdHRlci1zcXVhcmUnOiAnZjA4MScsICdmYWNlYm9vay1zcXVhcmUnOiAnZjA4MicsICdjYW1lcmEtcmV0cm8nOiAnZjA4MycsICdrZXknOiAnZjA4NCcsICdnZWFycyxjb2dzJzogJ2YwODUnLCAnY29tbWVudHMnOiAnZjA4NicsICd0aHVtYnMtby11cCc6ICdmMDg3JywgJ3RodW1icy1vLWRvd24nOiAnZjA4OCcsICdzdGFyLWhhbGYnOiAnZjA4OScsICdoZWFydC1vJzogJ2YwOGEnLCAnc2lnbi1vdXQnOiAnZjA4YicsICdsaW5rZWRpbi1zcXVhcmUnOiAnZjA4YycsICd0aHVtYi10YWNrJzogJ2YwOGQnLCAnZXh0ZXJuYWwtbGluayc6ICdmMDhlJywgJ3NpZ24taW4nOiAnZjA5MCcsICd0cm9waHknOiAnZjA5MScsICdnaXRodWItc3F1YXJlJzogJ2YwOTInLCAndXBsb2FkJzogJ2YwOTMnLCAnbGVtb24tbyc6ICdmMDk0JywgJ3Bob25lJzogJ2YwOTUnLCAnc3F1YXJlLW8nOiAnZjA5NicsICdib29rbWFyay1vJzogJ2YwOTcnLCAncGhvbmUtc3F1YXJlJzogJ2YwOTgnLCAndHdpdHRlcic6ICdmMDk5JywgJ2ZhY2Vib29rLWYsZmFjZWJvb2snOiAnZjA5YScsICdnaXRodWInOiAnZjA5YicsICd1bmxvY2snOiAnZjA5YycsICdjcmVkaXQtY2FyZCc6ICdmMDlkJywgJ2ZlZWQscnNzJzogJ2YwOWUnLCAnaGRkLW8nOiAnZjBhMCcsICdidWxsaG9ybic6ICdmMGExJywgJ2JlbGwnOiAnZjBmMycsICdjZXJ0aWZpY2F0ZSc6ICdmMGEzJywgJ2hhbmQtby1yaWdodCc6ICdmMGE0JywgJ2hhbmQtby1sZWZ0JzogJ2YwYTUnLCAnaGFuZC1vLXVwJzogJ2YwYTYnLCAnaGFuZC1vLWRvd24nOiAnZjBhNycsICdhcnJvdy1jaXJjbGUtbGVmdCc6ICdmMGE4JywgJ2Fycm93LWNpcmNsZS1yaWdodCc6ICdmMGE5JywgJ2Fycm93LWNpcmNsZS11cCc6ICdmMGFhJywgJ2Fycm93LWNpcmNsZS1kb3duJzogJ2YwYWInLCAnZ2xvYmUnOiAnZjBhYycsICd3cmVuY2gnOiAnZjBhZCcsICd0YXNrcyc6ICdmMGFlJywgJ2ZpbHRlcic6ICdmMGIwJywgJ2JyaWVmY2FzZSc6ICdmMGIxJywgJ2Fycm93cy1hbHQnOiAnZjBiMicsICdncm91cCx1c2Vycyc6ICdmMGMwJywgJ2NoYWluLGxpbmsnOiAnZjBjMScsICdjbG91ZCc6ICdmMGMyJywgJ2ZsYXNrJzogJ2YwYzMnLCAnY3V0LHNjaXNzb3JzJzogJ2YwYzQnLCAnY29weSxmaWxlcy1vJzogJ2YwYzUnLCAncGFwZXJjbGlwJzogJ2YwYzYnLCAnc2F2ZSxmbG9wcHktbyc6ICdmMGM3JywgJ3NxdWFyZSc6ICdmMGM4JywgJ25hdmljb24scmVvcmRlcixiYXJzJzogJ2YwYzknLCAnbGlzdC11bCc6ICdmMGNhJywgJ2xpc3Qtb2wnOiAnZjBjYicsICdzdHJpa2V0aHJvdWdoJzogJ2YwY2MnLCAndW5kZXJsaW5lJzogJ2YwY2QnLCAndGFibGUnOiAnZjBjZScsICdtYWdpYyc6ICdmMGQwJywgJ3RydWNrJzogJ2YwZDEnLCAncGludGVyZXN0JzogJ2YwZDInLCAncGludGVyZXN0LXNxdWFyZSc6ICdmMGQzJywgJ2dvb2dsZS1wbHVzLXNxdWFyZSc6ICdmMGQ0JywgJ2dvb2dsZS1wbHVzJzogJ2YwZDUnLCAnbW9uZXknOiAnZjBkNicsICdjYXJldC1kb3duJzogJ2YwZDcnLCAnY2FyZXQtdXAnOiAnZjBkOCcsICdjYXJldC1sZWZ0JzogJ2YwZDknLCAnY2FyZXQtcmlnaHQnOiAnZjBkYScsICdjb2x1bW5zJzogJ2YwZGInLCAndW5zb3J0ZWQsc29ydCc6ICdmMGRjJywgJ3NvcnQtZG93bixzb3J0LWRlc2MnOiAnZjBkZCcsICdzb3J0LXVwLHNvcnQtYXNjJzogJ2YwZGUnLCAnZW52ZWxvcGUnOiAnZjBlMCcsICdsaW5rZWRpbic6ICdmMGUxJywgJ3JvdGF0ZS1sZWZ0LHVuZG8nOiAnZjBlMicsICdsZWdhbCxnYXZlbCc6ICdmMGUzJywgJ2Rhc2hib2FyZCx0YWNob21ldGVyJzogJ2YwZTQnLCAnY29tbWVudC1vJzogJ2YwZTUnLCAnY29tbWVudHMtbyc6ICdmMGU2JywgJ2ZsYXNoLGJvbHQnOiAnZjBlNycsICdzaXRlbWFwJzogJ2YwZTgnLCAndW1icmVsbGEnOiAnZjBlOScsICdwYXN0ZSxjbGlwYm9hcmQnOiAnZjBlYScsICdsaWdodGJ1bGItbyc6ICdmMGViJywgJ2V4Y2hhbmdlJzogJ2YwZWMnLCAnY2xvdWQtZG93bmxvYWQnOiAnZjBlZCcsICdjbG91ZC11cGxvYWQnOiAnZjBlZScsICd1c2VyLW1kJzogJ2YwZjAnLCAnc3RldGhvc2NvcGUnOiAnZjBmMScsICdzdWl0Y2FzZSc6ICdmMGYyJywgJ2JlbGwtbyc6ICdmMGEyJywgJ2NvZmZlZSc6ICdmMGY0JywgJ2N1dGxlcnknOiAnZjBmNScsICdmaWxlLXRleHQtbyc6ICdmMGY2JywgJ2J1aWxkaW5nLW8nOiAnZjBmNycsICdob3NwaXRhbC1vJzogJ2YwZjgnLCAnYW1idWxhbmNlJzogJ2YwZjknLCAnbWVka2l0JzogJ2YwZmEnLCAnZmlnaHRlci1qZXQnOiAnZjBmYicsICdiZWVyJzogJ2YwZmMnLCAnaC1zcXVhcmUnOiAnZjBmZCcsICdwbHVzLXNxdWFyZSc6ICdmMGZlJywgJ2FuZ2xlLWRvdWJsZS1sZWZ0JzogJ2YxMDAnLCAnYW5nbGUtZG91YmxlLXJpZ2h0JzogJ2YxMDEnLCAnYW5nbGUtZG91YmxlLXVwJzogJ2YxMDInLCAnYW5nbGUtZG91YmxlLWRvd24nOiAnZjEwMycsICdhbmdsZS1sZWZ0JzogJ2YxMDQnLCAnYW5nbGUtcmlnaHQnOiAnZjEwNScsICdhbmdsZS11cCc6ICdmMTA2JywgJ2FuZ2xlLWRvd24nOiAnZjEwNycsICdkZXNrdG9wJzogJ2YxMDgnLCAnbGFwdG9wJzogJ2YxMDknLCAndGFibGV0JzogJ2YxMGEnLCAnbW9iaWxlLXBob25lLG1vYmlsZSc6ICdmMTBiJywgJ2NpcmNsZS1vJzogJ2YxMGMnLCAncXVvdGUtbGVmdCc6ICdmMTBkJywgJ3F1b3RlLXJpZ2h0JzogJ2YxMGUnLCAnc3Bpbm5lcic6ICdmMTEwJywgJ2NpcmNsZSc6ICdmMTExJywgJ21haWwtcmVwbHkscmVwbHknOiAnZjExMicsICdnaXRodWItYWx0JzogJ2YxMTMnLCAnZm9sZGVyLW8nOiAnZjExNCcsICdmb2xkZXItb3Blbi1vJzogJ2YxMTUnLCAnc21pbGUtbyc6ICdmMTE4JywgJ2Zyb3duLW8nOiAnZjExOScsICdtZWgtbyc6ICdmMTFhJywgJ2dhbWVwYWQnOiAnZjExYicsICdrZXlib2FyZC1vJzogJ2YxMWMnLCAnZmxhZy1vJzogJ2YxMWQnLCAnZmxhZy1jaGVja2VyZWQnOiAnZjExZScsICd0ZXJtaW5hbCc6ICdmMTIwJywgJ2NvZGUnOiAnZjEyMScsICdtYWlsLXJlcGx5LWFsbCxyZXBseS1hbGwnOiAnZjEyMicsICdzdGFyLWhhbGYtZW1wdHksc3Rhci1oYWxmLWZ1bGwsc3Rhci1oYWxmLW8nOiAnZjEyMycsICdsb2NhdGlvbi1hcnJvdyc6ICdmMTI0JywgJ2Nyb3AnOiAnZjEyNScsICdjb2RlLWZvcmsnOiAnZjEyNicsICd1bmxpbmssY2hhaW4tYnJva2VuJzogJ2YxMjcnLCAncXVlc3Rpb24nOiAnZjEyOCcsICdpbmZvJzogJ2YxMjknLCAnZXhjbGFtYXRpb24nOiAnZjEyYScsICdzdXBlcnNjcmlwdCc6ICdmMTJiJywgJ3N1YnNjcmlwdCc6ICdmMTJjJywgJ2VyYXNlcic6ICdmMTJkJywgJ3B1enpsZS1waWVjZSc6ICdmMTJlJywgJ21pY3JvcGhvbmUnOiAnZjEzMCcsICdtaWNyb3Bob25lLXNsYXNoJzogJ2YxMzEnLCAnc2hpZWxkJzogJ2YxMzInLCAnY2FsZW5kYXItbyc6ICdmMTMzJywgJ2ZpcmUtZXh0aW5ndWlzaGVyJzogJ2YxMzQnLCAncm9ja2V0JzogJ2YxMzUnLCAnbWF4Y2RuJzogJ2YxMzYnLCAnY2hldnJvbi1jaXJjbGUtbGVmdCc6ICdmMTM3JywgJ2NoZXZyb24tY2lyY2xlLXJpZ2h0JzogJ2YxMzgnLCAnY2hldnJvbi1jaXJjbGUtdXAnOiAnZjEzOScsICdjaGV2cm9uLWNpcmNsZS1kb3duJzogJ2YxM2EnLCAnaHRtbDUnOiAnZjEzYicsICdjc3MzJzogJ2YxM2MnLCAnYW5jaG9yJzogJ2YxM2QnLCAndW5sb2NrLWFsdCc6ICdmMTNlJywgJ2J1bGxzZXllJzogJ2YxNDAnLCAnZWxsaXBzaXMtaCc6ICdmMTQxJywgJ2VsbGlwc2lzLXYnOiAnZjE0MicsICdyc3Mtc3F1YXJlJzogJ2YxNDMnLCAncGxheS1jaXJjbGUnOiAnZjE0NCcsICd0aWNrZXQnOiAnZjE0NScsICdtaW51cy1zcXVhcmUnOiAnZjE0NicsICdtaW51cy1zcXVhcmUtbyc6ICdmMTQ3JywgJ2xldmVsLXVwJzogJ2YxNDgnLCAnbGV2ZWwtZG93bic6ICdmMTQ5JywgJ2NoZWNrLXNxdWFyZSc6ICdmMTRhJywgJ3BlbmNpbC1zcXVhcmUnOiAnZjE0YicsICdleHRlcm5hbC1saW5rLXNxdWFyZSc6ICdmMTRjJywgJ3NoYXJlLXNxdWFyZSc6ICdmMTRkJywgJ2NvbXBhc3MnOiAnZjE0ZScsICd0b2dnbGUtZG93bixjYXJldC1zcXVhcmUtby1kb3duJzogJ2YxNTAnLCAndG9nZ2xlLXVwLGNhcmV0LXNxdWFyZS1vLXVwJzogJ2YxNTEnLCAndG9nZ2xlLXJpZ2h0LGNhcmV0LXNxdWFyZS1vLXJpZ2h0JzogJ2YxNTInLCAnZXVybyxldXInOiAnZjE1MycsICdnYnAnOiAnZjE1NCcsICdkb2xsYXIsdXNkJzogJ2YxNTUnLCAncnVwZWUsaW5yJzogJ2YxNTYnLCAnY255LHJtYix5ZW4sanB5JzogJ2YxNTcnLCAncnVibGUscm91YmxlLHJ1Yic6ICdmMTU4JywgJ3dvbixrcncnOiAnZjE1OScsICdiaXRjb2luLGJ0Yyc6ICdmMTVhJywgJ2ZpbGUnOiAnZjE1YicsICdmaWxlLXRleHQnOiAnZjE1YycsICdzb3J0LWFscGhhLWFzYyc6ICdmMTVkJywgJ3NvcnQtYWxwaGEtZGVzYyc6ICdmMTVlJywgJ3NvcnQtYW1vdW50LWFzYyc6ICdmMTYwJywgJ3NvcnQtYW1vdW50LWRlc2MnOiAnZjE2MScsICdzb3J0LW51bWVyaWMtYXNjJzogJ2YxNjInLCAnc29ydC1udW1lcmljLWRlc2MnOiAnZjE2MycsICd0aHVtYnMtdXAnOiAnZjE2NCcsICd0aHVtYnMtZG93bic6ICdmMTY1JywgJ3lvdXR1YmUtc3F1YXJlJzogJ2YxNjYnLCAneW91dHViZSc6ICdmMTY3JywgJ3hpbmcnOiAnZjE2OCcsICd4aW5nLXNxdWFyZSc6ICdmMTY5JywgJ3lvdXR1YmUtcGxheSc6ICdmMTZhJywgJ2Ryb3Bib3gnOiAnZjE2YicsICdzdGFjay1vdmVyZmxvdyc6ICdmMTZjJywgJ2luc3RhZ3JhbSc6ICdmMTZkJywgJ2ZsaWNrcic6ICdmMTZlJywgJ2Fkbic6ICdmMTcwJywgJ2JpdGJ1Y2tldCc6ICdmMTcxJywgJ2JpdGJ1Y2tldC1zcXVhcmUnOiAnZjE3MicsICd0dW1ibHInOiAnZjE3MycsICd0dW1ibHItc3F1YXJlJzogJ2YxNzQnLCAnbG9uZy1hcnJvdy1kb3duJzogJ2YxNzUnLCAnbG9uZy1hcnJvdy11cCc6ICdmMTc2JywgJ2xvbmctYXJyb3ctbGVmdCc6ICdmMTc3JywgJ2xvbmctYXJyb3ctcmlnaHQnOiAnZjE3OCcsICdhcHBsZSc6ICdmMTc5JywgJ3dpbmRvd3MnOiAnZjE3YScsICdhbmRyb2lkJzogJ2YxN2InLCAnbGludXgnOiAnZjE3YycsICdkcmliYmJsZSc6ICdmMTdkJywgJ3NreXBlJzogJ2YxN2UnLCAnZm91cnNxdWFyZSc6ICdmMTgwJywgJ3RyZWxsbyc6ICdmMTgxJywgJ2ZlbWFsZSc6ICdmMTgyJywgJ21hbGUnOiAnZjE4MycsICdnaXR0aXAsZ3JhdGlwYXknOiAnZjE4NCcsICdzdW4tbyc6ICdmMTg1JywgJ21vb24tbyc6ICdmMTg2JywgJ2FyY2hpdmUnOiAnZjE4NycsICdidWcnOiAnZjE4OCcsICd2ayc6ICdmMTg5JywgJ3dlaWJvJzogJ2YxOGEnLCAncmVucmVuJzogJ2YxOGInLCAncGFnZWxpbmVzJzogJ2YxOGMnLCAnc3RhY2stZXhjaGFuZ2UnOiAnZjE4ZCcsICdhcnJvdy1jaXJjbGUtby1yaWdodCc6ICdmMThlJywgJ2Fycm93LWNpcmNsZS1vLWxlZnQnOiAnZjE5MCcsICd0b2dnbGUtbGVmdCxjYXJldC1zcXVhcmUtby1sZWZ0JzogJ2YxOTEnLCAnZG90LWNpcmNsZS1vJzogJ2YxOTInLCAnd2hlZWxjaGFpcic6ICdmMTkzJywgJ3ZpbWVvLXNxdWFyZSc6ICdmMTk0JywgJ3R1cmtpc2gtbGlyYSx0cnknOiAnZjE5NScsICdwbHVzLXNxdWFyZS1vJzogJ2YxOTYnLCAnc3BhY2Utc2h1dHRsZSc6ICdmMTk3JywgJ3NsYWNrJzogJ2YxOTgnLCAnZW52ZWxvcGUtc3F1YXJlJzogJ2YxOTknLCAnd29yZHByZXNzJzogJ2YxOWEnLCAnb3BlbmlkJzogJ2YxOWInLCAnaW5zdGl0dXRpb24sYmFuayx1bml2ZXJzaXR5JzogJ2YxOWMnLCAnbW9ydGFyLWJvYXJkLGdyYWR1YXRpb24tY2FwJzogJ2YxOWQnLCAneWFob28nOiAnZjE5ZScsICdnb29nbGUnOiAnZjFhMCcsICdyZWRkaXQnOiAnZjFhMScsICdyZWRkaXQtc3F1YXJlJzogJ2YxYTInLCAnc3R1bWJsZXVwb24tY2lyY2xlJzogJ2YxYTMnLCAnc3R1bWJsZXVwb24nOiAnZjFhNCcsICdkZWxpY2lvdXMnOiAnZjFhNScsICdkaWdnJzogJ2YxYTYnLCAncGllZC1waXBlci1wcCc6ICdmMWE3JywgJ3BpZWQtcGlwZXItYWx0JzogJ2YxYTgnLCAnZHJ1cGFsJzogJ2YxYTknLCAnam9vbWxhJzogJ2YxYWEnLCAnbGFuZ3VhZ2UnOiAnZjFhYicsICdmYXgnOiAnZjFhYycsICdidWlsZGluZyc6ICdmMWFkJywgJ2NoaWxkJzogJ2YxYWUnLCAncGF3JzogJ2YxYjAnLCAnc3Bvb24nOiAnZjFiMScsICdjdWJlJzogJ2YxYjInLCAnY3ViZXMnOiAnZjFiMycsICdiZWhhbmNlJzogJ2YxYjQnLCAnYmVoYW5jZS1zcXVhcmUnOiAnZjFiNScsICdzdGVhbSc6ICdmMWI2JywgJ3N0ZWFtLXNxdWFyZSc6ICdmMWI3JywgJ3JlY3ljbGUnOiAnZjFiOCcsICdhdXRvbW9iaWxlLGNhcic6ICdmMWI5JywgJ2NhYix0YXhpJzogJ2YxYmEnLCAndHJlZSc6ICdmMWJiJywgJ3Nwb3RpZnknOiAnZjFiYycsICdkZXZpYW50YXJ0JzogJ2YxYmQnLCAnc291bmRjbG91ZCc6ICdmMWJlJywgJ2RhdGFiYXNlJzogJ2YxYzAnLCAnZmlsZS1wZGYtbyc6ICdmMWMxJywgJ2ZpbGUtd29yZC1vJzogJ2YxYzInLCAnZmlsZS1leGNlbC1vJzogJ2YxYzMnLCAnZmlsZS1wb3dlcnBvaW50LW8nOiAnZjFjNCcsICdmaWxlLXBob3RvLW8sZmlsZS1waWN0dXJlLW8sZmlsZS1pbWFnZS1vJzogJ2YxYzUnLCAnZmlsZS16aXAtbyxmaWxlLWFyY2hpdmUtbyc6ICdmMWM2JywgJ2ZpbGUtc291bmQtbyxmaWxlLWF1ZGlvLW8nOiAnZjFjNycsICdmaWxlLW1vdmllLW8sZmlsZS12aWRlby1vJzogJ2YxYzgnLCAnZmlsZS1jb2RlLW8nOiAnZjFjOScsICd2aW5lJzogJ2YxY2EnLCAnY29kZXBlbic6ICdmMWNiJywgJ2pzZmlkZGxlJzogJ2YxY2MnLCAnbGlmZS1ib3V5LGxpZmUtYnVveSxsaWZlLXNhdmVyLHN1cHBvcnQsbGlmZS1yaW5nJzogJ2YxY2QnLCAnY2lyY2xlLW8tbm90Y2gnOiAnZjFjZScsICdyYSxyZXNpc3RhbmNlLHJlYmVsJzogJ2YxZDAnLCAnZ2UsZW1waXJlJzogJ2YxZDEnLCAnZ2l0LXNxdWFyZSc6ICdmMWQyJywgJ2dpdCc6ICdmMWQzJywgJ3ktY29tYmluYXRvci1zcXVhcmUseWMtc3F1YXJlLGhhY2tlci1uZXdzJzogJ2YxZDQnLCAndGVuY2VudC13ZWlibyc6ICdmMWQ1JywgJ3FxJzogJ2YxZDYnLCAnd2VjaGF0LHdlaXhpbic6ICdmMWQ3JywgJ3NlbmQscGFwZXItcGxhbmUnOiAnZjFkOCcsICdzZW5kLW8scGFwZXItcGxhbmUtbyc6ICdmMWQ5JywgJ2hpc3RvcnknOiAnZjFkYScsICdjaXJjbGUtdGhpbic6ICdmMWRiJywgJ2hlYWRlcic6ICdmMWRjJywgJ3BhcmFncmFwaCc6ICdmMWRkJywgJ3NsaWRlcnMnOiAnZjFkZScsICdzaGFyZS1hbHQnOiAnZjFlMCcsICdzaGFyZS1hbHQtc3F1YXJlJzogJ2YxZTEnLCAnYm9tYic6ICdmMWUyJywgJ3NvY2Nlci1iYWxsLW8sZnV0Ym9sLW8nOiAnZjFlMycsICd0dHknOiAnZjFlNCcsICdiaW5vY3VsYXJzJzogJ2YxZTUnLCAncGx1Zyc6ICdmMWU2JywgJ3NsaWRlc2hhcmUnOiAnZjFlNycsICd0d2l0Y2gnOiAnZjFlOCcsICd5ZWxwJzogJ2YxZTknLCAnbmV3c3BhcGVyLW8nOiAnZjFlYScsICd3aWZpJzogJ2YxZWInLCAnY2FsY3VsYXRvcic6ICdmMWVjJywgJ3BheXBhbCc6ICdmMWVkJywgJ2dvb2dsZS13YWxsZXQnOiAnZjFlZScsICdjYy12aXNhJzogJ2YxZjAnLCAnY2MtbWFzdGVyY2FyZCc6ICdmMWYxJywgJ2NjLWRpc2NvdmVyJzogJ2YxZjInLCAnY2MtYW1leCc6ICdmMWYzJywgJ2NjLXBheXBhbCc6ICdmMWY0JywgJ2NjLXN0cmlwZSc6ICdmMWY1JywgJ2JlbGwtc2xhc2gnOiAnZjFmNicsICdiZWxsLXNsYXNoLW8nOiAnZjFmNycsICd0cmFzaCc6ICdmMWY4JywgJ2NvcHlyaWdodCc6ICdmMWY5JywgJ2F0JzogJ2YxZmEnLCAnZXllZHJvcHBlcic6ICdmMWZiJywgJ3BhaW50LWJydXNoJzogJ2YxZmMnLCAnYmlydGhkYXktY2FrZSc6ICdmMWZkJywgJ2FyZWEtY2hhcnQnOiAnZjFmZScsICdwaWUtY2hhcnQnOiAnZjIwMCcsICdsaW5lLWNoYXJ0JzogJ2YyMDEnLCAnbGFzdGZtJzogJ2YyMDInLCAnbGFzdGZtLXNxdWFyZSc6ICdmMjAzJywgJ3RvZ2dsZS1vZmYnOiAnZjIwNCcsICd0b2dnbGUtb24nOiAnZjIwNScsICdiaWN5Y2xlJzogJ2YyMDYnLCAnYnVzJzogJ2YyMDcnLCAnaW94aG9zdCc6ICdmMjA4JywgJ2FuZ2VsbGlzdCc6ICdmMjA5JywgJ2NjJzogJ2YyMGEnLCAnc2hla2VsLHNoZXFlbCxpbHMnOiAnZjIwYicsICdtZWFucGF0aCc6ICdmMjBjJywgJ2J1eXNlbGxhZHMnOiAnZjIwZCcsICdjb25uZWN0ZGV2ZWxvcCc6ICdmMjBlJywgJ2Rhc2hjdWJlJzogJ2YyMTAnLCAnZm9ydW1iZWUnOiAnZjIxMScsICdsZWFucHViJzogJ2YyMTInLCAnc2VsbHN5JzogJ2YyMTMnLCAnc2hpcnRzaW5idWxrJzogJ2YyMTQnLCAnc2ltcGx5YnVpbHQnOiAnZjIxNScsICdza3lhdGxhcyc6ICdmMjE2JywgJ2NhcnQtcGx1cyc6ICdmMjE3JywgJ2NhcnQtYXJyb3ctZG93bic6ICdmMjE4JywgJ2RpYW1vbmQnOiAnZjIxOScsICdzaGlwJzogJ2YyMWEnLCAndXNlci1zZWNyZXQnOiAnZjIxYicsICdtb3RvcmN5Y2xlJzogJ2YyMWMnLCAnc3RyZWV0LXZpZXcnOiAnZjIxZCcsICdoZWFydGJlYXQnOiAnZjIxZScsICd2ZW51cyc6ICdmMjIxJywgJ21hcnMnOiAnZjIyMicsICdtZXJjdXJ5JzogJ2YyMjMnLCAnaW50ZXJzZXgsdHJhbnNnZW5kZXInOiAnZjIyNCcsICd0cmFuc2dlbmRlci1hbHQnOiAnZjIyNScsICd2ZW51cy1kb3VibGUnOiAnZjIyNicsICdtYXJzLWRvdWJsZSc6ICdmMjI3JywgJ3ZlbnVzLW1hcnMnOiAnZjIyOCcsICdtYXJzLXN0cm9rZSc6ICdmMjI5JywgJ21hcnMtc3Ryb2tlLXYnOiAnZjIyYScsICdtYXJzLXN0cm9rZS1oJzogJ2YyMmInLCAnbmV1dGVyJzogJ2YyMmMnLCAnZ2VuZGVybGVzcyc6ICdmMjJkJywgJ2ZhY2Vib29rLW9mZmljaWFsJzogJ2YyMzAnLCAncGludGVyZXN0LXAnOiAnZjIzMScsICd3aGF0c2FwcCc6ICdmMjMyJywgJ3NlcnZlcic6ICdmMjMzJywgJ3VzZXItcGx1cyc6ICdmMjM0JywgJ3VzZXItdGltZXMnOiAnZjIzNScsICdob3RlbCxiZWQnOiAnZjIzNicsICd2aWFjb2luJzogJ2YyMzcnLCAndHJhaW4nOiAnZjIzOCcsICdzdWJ3YXknOiAnZjIzOScsICdtZWRpdW0nOiAnZjIzYScsICd5Yyx5LWNvbWJpbmF0b3InOiAnZjIzYicsICdvcHRpbi1tb25zdGVyJzogJ2YyM2MnLCAnb3BlbmNhcnQnOiAnZjIzZCcsICdleHBlZGl0ZWRzc2wnOiAnZjIzZScsICdiYXR0ZXJ5LTQsYmF0dGVyeS1mdWxsJzogJ2YyNDAnLCAnYmF0dGVyeS0zLGJhdHRlcnktdGhyZWUtcXVhcnRlcnMnOiAnZjI0MScsICdiYXR0ZXJ5LTIsYmF0dGVyeS1oYWxmJzogJ2YyNDInLCAnYmF0dGVyeS0xLGJhdHRlcnktcXVhcnRlcic6ICdmMjQzJywgJ2JhdHRlcnktMCxiYXR0ZXJ5LWVtcHR5JzogJ2YyNDQnLCAnbW91c2UtcG9pbnRlcic6ICdmMjQ1JywgJ2ktY3Vyc29yJzogJ2YyNDYnLCAnb2JqZWN0LWdyb3VwJzogJ2YyNDcnLCAnb2JqZWN0LXVuZ3JvdXAnOiAnZjI0OCcsICdzdGlja3ktbm90ZSc6ICdmMjQ5JywgJ3N0aWNreS1ub3RlLW8nOiAnZjI0YScsICdjYy1qY2InOiAnZjI0YicsICdjYy1kaW5lcnMtY2x1Yic6ICdmMjRjJywgJ2Nsb25lJzogJ2YyNGQnLCAnYmFsYW5jZS1zY2FsZSc6ICdmMjRlJywgJ2hvdXJnbGFzcy1vJzogJ2YyNTAnLCAnaG91cmdsYXNzLTEsaG91cmdsYXNzLXN0YXJ0JzogJ2YyNTEnLCAnaG91cmdsYXNzLTIsaG91cmdsYXNzLWhhbGYnOiAnZjI1MicsICdob3VyZ2xhc3MtMyxob3VyZ2xhc3MtZW5kJzogJ2YyNTMnLCAnaG91cmdsYXNzJzogJ2YyNTQnLCAnaGFuZC1ncmFiLW8saGFuZC1yb2NrLW8nOiAnZjI1NScsICdoYW5kLXN0b3AtbyxoYW5kLXBhcGVyLW8nOiAnZjI1NicsICdoYW5kLXNjaXNzb3JzLW8nOiAnZjI1NycsICdoYW5kLWxpemFyZC1vJzogJ2YyNTgnLCAnaGFuZC1zcG9jay1vJzogJ2YyNTknLCAnaGFuZC1wb2ludGVyLW8nOiAnZjI1YScsICdoYW5kLXBlYWNlLW8nOiAnZjI1YicsICd0cmFkZW1hcmsnOiAnZjI1YycsICdyZWdpc3RlcmVkJzogJ2YyNWQnLCAnY3JlYXRpdmUtY29tbW9ucyc6ICdmMjVlJywgJ2dnJzogJ2YyNjAnLCAnZ2ctY2lyY2xlJzogJ2YyNjEnLCAndHJpcGFkdmlzb3InOiAnZjI2MicsICdvZG5va2xhc3NuaWtpJzogJ2YyNjMnLCAnb2Rub2tsYXNzbmlraS1zcXVhcmUnOiAnZjI2NCcsICdnZXQtcG9ja2V0JzogJ2YyNjUnLCAnd2lraXBlZGlhLXcnOiAnZjI2NicsICdzYWZhcmknOiAnZjI2NycsICdjaHJvbWUnOiAnZjI2OCcsICdmaXJlZm94JzogJ2YyNjknLCAnb3BlcmEnOiAnZjI2YScsICdpbnRlcm5ldC1leHBsb3Jlcic6ICdmMjZiJywgJ3R2LHRlbGV2aXNpb24nOiAnZjI2YycsICdjb250YW8nOiAnZjI2ZCcsICc1MDBweCc6ICdmMjZlJywgJ2FtYXpvbic6ICdmMjcwJywgJ2NhbGVuZGFyLXBsdXMtbyc6ICdmMjcxJywgJ2NhbGVuZGFyLW1pbnVzLW8nOiAnZjI3MicsICdjYWxlbmRhci10aW1lcy1vJzogJ2YyNzMnLCAnY2FsZW5kYXItY2hlY2stbyc6ICdmMjc0JywgJ2luZHVzdHJ5JzogJ2YyNzUnLCAnbWFwLXBpbic6ICdmMjc2JywgJ21hcC1zaWducyc6ICdmMjc3JywgJ21hcC1vJzogJ2YyNzgnLCAnbWFwJzogJ2YyNzknLCAnY29tbWVudGluZyc6ICdmMjdhJywgJ2NvbW1lbnRpbmctbyc6ICdmMjdiJywgJ2hvdXp6JzogJ2YyN2MnLCAndmltZW8nOiAnZjI3ZCcsICdibGFjay10aWUnOiAnZjI3ZScsICdmb250aWNvbnMnOiAnZjI4MCcsICdyZWRkaXQtYWxpZW4nOiAnZjI4MScsICdlZGdlJzogJ2YyODInLCAnY3JlZGl0LWNhcmQtYWx0JzogJ2YyODMnLCAnY29kaWVwaWUnOiAnZjI4NCcsICdtb2R4JzogJ2YyODUnLCAnZm9ydC1hd2Vzb21lJzogJ2YyODYnLCAndXNiJzogJ2YyODcnLCAncHJvZHVjdC1odW50JzogJ2YyODgnLCAnbWl4Y2xvdWQnOiAnZjI4OScsICdzY3JpYmQnOiAnZjI4YScsICdwYXVzZS1jaXJjbGUnOiAnZjI4YicsICdwYXVzZS1jaXJjbGUtbyc6ICdmMjhjJywgJ3N0b3AtY2lyY2xlJzogJ2YyOGQnLCAnc3RvcC1jaXJjbGUtbyc6ICdmMjhlJywgJ3Nob3BwaW5nLWJhZyc6ICdmMjkwJywgJ3Nob3BwaW5nLWJhc2tldCc6ICdmMjkxJywgJ2hhc2h0YWcnOiAnZjI5MicsICdibHVldG9vdGgnOiAnZjI5MycsICdibHVldG9vdGgtYic6ICdmMjk0JywgJ3BlcmNlbnQnOiAnZjI5NScsICdnaXRsYWInOiAnZjI5NicsICd3cGJlZ2lubmVyJzogJ2YyOTcnLCAnd3Bmb3Jtcyc6ICdmMjk4JywgJ2VudmlyYSc6ICdmMjk5JywgJ3VuaXZlcnNhbC1hY2Nlc3MnOiAnZjI5YScsICd3aGVlbGNoYWlyLWFsdCc6ICdmMjliJywgJ3F1ZXN0aW9uLWNpcmNsZS1vJzogJ2YyOWMnLCAnYmxpbmQnOiAnZjI5ZCcsICdhdWRpby1kZXNjcmlwdGlvbic6ICdmMjllJywgJ3ZvbHVtZS1jb250cm9sLXBob25lJzogJ2YyYTAnLCAnYnJhaWxsZSc6ICdmMmExJywgJ2Fzc2lzdGl2ZS1saXN0ZW5pbmctc3lzdGVtcyc6ICdmMmEyJywgJ2FzbC1pbnRlcnByZXRpbmcsYW1lcmljYW4tc2lnbi1sYW5ndWFnZS1pbnRlcnByZXRpbmcnOiAnZjJhMycsICdkZWFmbmVzcyxoYXJkLW9mLWhlYXJpbmcsZGVhZic6ICdmMmE0JywgJ2dsaWRlJzogJ2YyYTUnLCAnZ2xpZGUtZyc6ICdmMmE2JywgJ3NpZ25pbmcsc2lnbi1sYW5ndWFnZSc6ICdmMmE3JywgJ2xvdy12aXNpb24nOiAnZjJhOCcsICd2aWFkZW8nOiAnZjJhOScsICd2aWFkZW8tc3F1YXJlJzogJ2YyYWEnLCAnc25hcGNoYXQnOiAnZjJhYicsICdzbmFwY2hhdC1naG9zdCc6ICdmMmFjJywgJ3NuYXBjaGF0LXNxdWFyZSc6ICdmMmFkJywgJ3BpZWQtcGlwZXInOiAnZjJhZScsICdmaXJzdC1vcmRlcic6ICdmMmIwJywgJ3lvYXN0JzogJ2YyYjEnLCAndGhlbWVpc2xlJzogJ2YyYjInLCAnZ29vZ2xlLXBsdXMtY2lyY2xlLGdvb2dsZS1wbHVzLW9mZmljaWFsJzogJ2YyYjMnLCAnZmEsZm9udC1hd2Vzb21lJzogJ2YyYjQnIH07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaWNvbihkKSB7XHJcbiAgICAgICAgdmFyIGNvZGU7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmljb25NYXAgJiYgb3B0aW9ucy5zaG93SWNvbnMgJiYgb3B0aW9ucy5pY29ucykge1xyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV0gJiYgb3B0aW9ucy5pY29uTWFwW29wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dXSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IG9wdGlvbnMuaWNvbk1hcFtvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXV07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pY29uTWFwW2QubGFiZWxzWzBdXSkge1xyXG4gICAgICAgICAgICAgICAgY29kZSA9IG9wdGlvbnMuaWNvbk1hcFtkLmxhYmVsc1swXV07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNvZGU7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW1hZ2UoZCkge1xyXG4gICAgICAgIHZhciBpLCBpbWFnZXNGb3JMYWJlbCwgaW1nLCBpbWdMZXZlbCwgbGFiZWwsIGxhYmVsUHJvcGVydHlWYWx1ZSwgcHJvcGVydHksIHZhbHVlO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcclxuICAgICAgICAgICAgaW1hZ2VzRm9yTGFiZWwgPSBvcHRpb25zLmltYWdlTWFwW2QubGFiZWxzWzBdXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpbWFnZXNGb3JMYWJlbCkge1xyXG4gICAgICAgICAgICAgICAgaW1nTGV2ZWwgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpbWFnZXNGb3JMYWJlbC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsUHJvcGVydHlWYWx1ZSA9IGltYWdlc0ZvckxhYmVsW2ldLnNwbGl0KCd8Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbCA9IGxhYmVsUHJvcGVydHlWYWx1ZVswXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkLmxhYmVsc1swXSA9PT0gbGFiZWwgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCFwcm9wZXJ0eSB8fCBkLnByb3BlcnRpZXNbcHJvcGVydHldICE9PSB1bmRlZmluZWQpICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICghdmFsdWUgfHwgZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSA9PT0gdmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoID4gaW1nTGV2ZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltZyA9IG9wdGlvbnMuaW1hZ2VzW2ltYWdlc0ZvckxhYmVsW2ldXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltZ0xldmVsID0gbGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGltZztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0KF9zZWxlY3RvciwgX29wdGlvbnMpIHtcclxuICAgICAgICBpbml0SWNvbk1hcCgpO1xyXG5cclxuICAgICAgICBtZXJnZShvcHRpb25zLCBfb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmljb25zKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuc2hvd0ljb25zID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghb3B0aW9ucy5taW5Db2xsaXNpb24pIHtcclxuICAgICAgICAgICAgb3B0aW9ucy5taW5Db2xsaXNpb24gPSBvcHRpb25zLm5vZGVSYWRpdXMgKiAyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5pdEltYWdlTWFwKCk7XHJcblxyXG4gICAgICAgIHNlbGVjdG9yID0gX3NlbGVjdG9yO1xyXG5cclxuICAgICAgICBjb250YWluZXIgPSBkMy5zZWxlY3Qoc2VsZWN0b3IpO1xyXG5cclxuICAgICAgICBjb250YWluZXIuYXR0cignY2xhc3MnLCAnbmVvNGpkMycpXHJcbiAgICAgICAgICAgIC5odG1sKCcnKTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5mb1BhbmVsKSB7XHJcbiAgICAgICAgICAgIGluZm8gPSBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGVuZEdyYXBoKGNvbnRhaW5lcik7XHJcbiAgICAgICAgc2ltdWxhdGlvbiA9IGluaXRTaW11bGF0aW9uKCk7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMubmVvNGpEYXRhKSB7XHJcbiAgICAgICAgICAgIGxvYWROZW80akRhdGEob3B0aW9ucy5uZW80akRhdGEpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5uZW80akRhdGFVcmwpIHtcclxuICAgICAgICAgICAgbG9hZE5lbzRqRGF0YUZyb21Vcmwob3B0aW9ucy5uZW80akRhdGFVcmwpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOiBib3RoIG5lbzRqRGF0YSBhbmQgbmVvNGpEYXRhVXJsIGFyZSBlbXB0eSEnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcHNDb3B5ID0gcmVsYXRpb25zaGlwcy5tYXAoZnVuY3Rpb24gKGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGEpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXRJY29uTWFwKCkge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKG9wdGlvbnMuaWNvbk1hcCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5LCBpbmRleCkge1xyXG4gICAgICAgICAgICB2YXIga2V5cyA9IGtleS5zcGxpdCgnLCcpLFxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBvcHRpb25zLmljb25NYXBba2V5XTtcclxuXHJcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmljb25NYXBba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0SW1hZ2VNYXAoKSB7XHJcbiAgICAgICAgdmFyIGtleSwga2V5cywgc2VsZWN0b3I7XHJcblxyXG4gICAgICAgIGZvciAoa2V5IGluIG9wdGlvbnMuaW1hZ2VzKSB7XHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmltYWdlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICBrZXlzID0ga2V5LnNwbGl0KCd8Jyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5pbWFnZU1hcFtrZXlzWzBdXSA9IFtrZXldO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dLnB1c2goa2V5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0U2ltdWxhdGlvbigpIHtcclxuICAgICAgICB2YXIgc2ltdWxhdGlvbiA9IGQzLmZvcmNlU2ltdWxhdGlvbigpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY29sbGlkZScsIGQzLmZvcmNlQ29sbGlkZSgpLnJhZGl1cyhmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubWluQ29sbGlzaW9uO1xyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgLmZvcmNlKCdjaGFyZ2UnLCBkMy5mb3JjZU1hbnlCb2R5KCkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnbGluaycsIGQzLmZvcmNlTGluaygpLmlkKGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5pZDtcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIC5mb3JjZSgnY2VudGVyJywgZDMuZm9yY2VDZW50ZXIoc3ZnLm5vZGUoKS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQuY2xpZW50V2lkdGggLyAyLCBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5jbGllbnRIZWlnaHQgLyAyKSlcclxuICAgICAgICAgICAgLm9uKCd0aWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdGljaygpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnpvb21GaXQgJiYgIWp1c3RMb2FkZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBqdXN0TG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB6b29tRml0KDIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNpbXVsYXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YSgpIHtcclxuICAgICAgICBub2RlcyA9IFtdO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSBbXTtcclxuXHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YUZyb21VcmwobmVvNGpEYXRhVXJsKSB7XHJcbiAgICAgICAgbm9kZXMgPSBbXTtcclxuICAgICAgICByZWxhdGlvbnNoaXBzID0gW107XHJcblxyXG4gICAgICAgIGQzLmpzb24obmVvNGpEYXRhVXJsLCBmdW5jdGlvbiAoZXJyb3IsIGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtZXJnZSh0YXJnZXQsIHNvdXJjZSkge1xyXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHNvdXJjZVtwcm9wZXJ0eV07XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbmVvNGpEYXRhVG9EM0RhdGEoZGF0YSkge1xyXG4gICAgICAgIHZhciBncmFwaCA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGRhdGEucmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uIChyZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZm9yRWFjaChmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb250YWlucyhncmFwaC5ub2Rlcywgbm9kZS5pZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGgubm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMuZm9yRWFjaChmdW5jdGlvbiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjb250YWlucyhncmFwaC5yZWxhdGlvbnNoaXBzLCByZWxhdGlvbnNoaXAuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5zb3VyY2UgPSByZWxhdGlvbnNoaXAuc3RhcnROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxhdGlvbnNoaXAudGFyZ2V0ID0gcmVsYXRpb25zaGlwLmVuZE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyYXBoLnJlbGF0aW9uc2hpcHMucHVzaChyZWxhdGlvbnNoaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGEuc291cmNlID4gYi5zb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhLnNvdXJjZSA8IGIuc291cmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS50YXJnZXQgPiBiLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhLnRhcmdldCA8IGIudGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09IDAgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnNvdXJjZSA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS5zb3VyY2UgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnRhcmdldCA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLmxpbmtudW0gPSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaSAtIDFdLmxpbmtudW0gKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5saW5rbnVtID0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gZ3JhcGg7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kRGF0YVRvTm9kZU91dHdhcmQoc291cmNlTm9kZSwgbmV3Tm9kZXMsIG5ld1JlbGF0aW9uc2hpcHMpIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgICAgIG5vZGUsXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCxcclxuICAgICAgICAgICAgcyA9IHNpemUoKSxcclxuICAgICAgICAgICAgbWFwID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuZXdOb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBub2RlID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMubm9kZXMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIGxhYmVsczogbmV3Tm9kZXNbaV0ubGFiZWxzLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogbmV3Tm9kZXNbaV0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHg6IHNvdXJjZU5vZGUueCxcclxuICAgICAgICAgICAgICAgIHk6IHNvdXJjZU5vZGUueVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBtYXBbbmV3Tm9kZXNbaV0uaWRdID0gbm9kZS5pZDtcclxuICAgICAgICAgICAgZGF0YS5ub2Rlc1tkYXRhLm5vZGVzLmxlbmd0aF0gPSBub2RlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuZXdSZWxhdGlvbnNoaXBzLmxlbmd0aDsgaisrKSB7XHJcblxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5yZWxhdGlvbnNoaXBzICsgMSArIGosXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBuZXdSZWxhdGlvbnNoaXBzW2pdLnR5cGUsXHJcbiAgICAgICAgICAgICAgICBzdGFydE5vZGU6IHNvdXJjZU5vZGUuaWQudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgIGVuZE5vZGU6IG1hcFtuZXdSZWxhdGlvbnNoaXBzW2pdLmVuZE5vZGVdLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogbmV3UmVsYXRpb25zaGlwc1tqXS5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VOb2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBtYXBbbmV3UmVsYXRpb25zaGlwc1tqXS5lbmROb2RlXSxcclxuICAgICAgICAgICAgICAgIGxpbmtudW06IHMucmVsYXRpb25zaGlwcyArIDEgKyBqXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBkYXRhLnJlbGF0aW9uc2hpcHNbZGF0YS5yZWxhdGlvbnNoaXBzLmxlbmd0aF0gPSByZWxhdGlvbnNoaXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZGF0YSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZERhdGFUb05vZGVJbndhcmQoc291cmNlTm9kZSwgbmV3Tm9kZXMsIG5ld1JlbGF0aW9uc2hpcHMpIHtcclxuICAgICAgICB2YXIgZGF0YSA9IHtcclxuICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiBbXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgICAgIG5vZGUsXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCxcclxuICAgICAgICAgICAgcyA9IHNpemUoKSxcclxuICAgICAgICAgICAgbWFwID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuZXdOb2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBub2RlID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMubm9kZXMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIGxhYmVsczogbmV3Tm9kZXNbaV0ubGFiZWxzLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogbmV3Tm9kZXNbaV0ucHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIHg6IHNvdXJjZU5vZGUueCxcclxuICAgICAgICAgICAgICAgIHk6IHNvdXJjZU5vZGUueVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBtYXBbbmV3Tm9kZXNbaV0uaWRdID0gbm9kZS5pZDtcclxuICAgICAgICAgICAgZGF0YS5ub2Rlc1tkYXRhLm5vZGVzLmxlbmd0aF0gPSBub2RlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG5ld1JlbGF0aW9uc2hpcHMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMucmVsYXRpb25zaGlwcyArIDEgKyBqLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogbmV3UmVsYXRpb25zaGlwc1tqXS50eXBlLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBtYXBbbmV3UmVsYXRpb25zaGlwc1tqXS5zdGFydE5vZGVdLFxyXG4gICAgICAgICAgICAgICAgZW5kTm9kZTogc291cmNlTm9kZS5pZC50b1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogbmV3UmVsYXRpb25zaGlwc1tqXS5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgc291cmNlOiBtYXBbbmV3UmVsYXRpb25zaGlwc1tqXS5zdGFydE5vZGVdLFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzb3VyY2VOb2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgbGlua251bTogcy5yZWxhdGlvbnNoaXBzICsgMSArIGpcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGRhdGEucmVsYXRpb25zaGlwc1tkYXRhLnJlbGF0aW9uc2hpcHMubGVuZ3RoXSA9IHJlbGF0aW9uc2hpcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdXBkYXRlV2l0aEQzRGF0YShkYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByYW5kb21EM0RhdGEoZCwgbWF4Tm9kZXNUb0dlbmVyYXRlKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9LFxyXG4gICAgICAgICAgICBpLFxyXG4gICAgICAgICAgICBsYWJlbCxcclxuICAgICAgICAgICAgbm9kZSxcclxuICAgICAgICAgICAgbnVtTm9kZXMgPSAobWF4Tm9kZXNUb0dlbmVyYXRlICogTWF0aC5yYW5kb20oKSA8PCAwKSArIDEsXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCxcclxuICAgICAgICAgICAgcyA9IHNpemUoKTtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtTm9kZXM7IGkrKykge1xyXG4gICAgICAgICAgICBsYWJlbCA9IHJhbmRvbUxhYmVsKCk7XHJcblxyXG4gICAgICAgICAgICBub2RlID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IHMubm9kZXMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIGxhYmVsczogW2xhYmVsXSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICByYW5kb206IGxhYmVsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgeDogZC54LFxyXG4gICAgICAgICAgICAgICAgeTogZC55XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBkYXRhLm5vZGVzW2RhdGEubm9kZXMubGVuZ3RoXSA9IG5vZGU7XHJcblxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5yZWxhdGlvbnNoaXBzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBsYWJlbC50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBkLmlkLFxyXG4gICAgICAgICAgICAgICAgZW5kTm9kZTogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGZyb206IERhdGUubm93KClcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IGQuaWQsXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHMubm9kZXMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIGxpbmtudW06IHMucmVsYXRpb25zaGlwcyArIDEgKyBpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGRhdGEucmVsYXRpb25zaGlwc1tkYXRhLnJlbGF0aW9uc2hpcHMubGVuZ3RoXSA9IHJlbGF0aW9uc2hpcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmFuZG9tTGFiZWwoKSB7XHJcbiAgICAgICAgdmFyIGljb25zID0gT2JqZWN0LmtleXMob3B0aW9ucy5pY29uTWFwKTtcclxuICAgICAgICByZXR1cm4gaWNvbnNbaWNvbnMubGVuZ3RoICogTWF0aC5yYW5kb20oKSA8PCAwXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGUoY3gsIGN5LCB4LCB5LCBhbmdsZSkge1xyXG4gICAgICAgIHZhciByYWRpYW5zID0gKE1hdGguUEkgLyAxODApICogYW5nbGUsXHJcbiAgICAgICAgICAgIGNvcyA9IE1hdGguY29zKHJhZGlhbnMpLFxyXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihyYWRpYW5zKSxcclxuICAgICAgICAgICAgbnggPSAoY29zICogKHggLSBjeCkpICsgKHNpbiAqICh5IC0gY3kpKSArIGN4LFxyXG4gICAgICAgICAgICBueSA9IChjb3MgKiAoeSAtIGN5KSkgLSAoc2luICogKHggLSBjeCkpICsgY3k7XHJcblxyXG4gICAgICAgIHJldHVybiB7IHg6IG54LCB5OiBueSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZVBvaW50KGMsIHAsIGFuZ2xlKSB7XHJcbiAgICAgICAgcmV0dXJuIHJvdGF0ZShjLngsIGMueSwgcC54LCBwLnksIGFuZ2xlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGlvbihzb3VyY2UsIHRhcmdldCkge1xyXG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRhcmdldC55IC0gc291cmNlLnksIHRhcmdldC54IC0gc291cmNlLngpICogMTgwIC8gTWF0aC5QSTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzaXplKCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBub2Rlcy5sZW5ndGgsXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IHJlbGF0aW9uc2hpcHMubGVuZ3RoXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAgICAgZnVuY3Rpb24gc21vb3RoVHJhbnNmb3JtKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUpIHtcclxuICAgICAgICAgICAgdmFyIGFuaW1hdGlvbk1pbGxpc2Vjb25kcyA9IDUwMDAsXHJcbiAgICAgICAgICAgICAgICB0aW1lb3V0TWlsbGlzZWNvbmRzID0gNTAsXHJcbiAgICAgICAgICAgICAgICBzdGVwcyA9IHBhcnNlSW50KGFuaW1hdGlvbk1pbGxpc2Vjb25kcyAvIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG4gICAgXHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIDEsIHN0ZXBzKTtcclxuICAgICAgICAgICAgfSwgdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgZnVuY3Rpb24gc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCBzdGVwLCBzdGVwcykge1xyXG4gICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSBzdGVwIC8gc3RlcHM7XHJcbiAgICBcclxuICAgICAgICAgICAgZWxlbS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyAodHJhbnNsYXRlWzBdICogcHJvZ3Jlc3MpICsgJywgJyArICh0cmFuc2xhdGVbMV0gKiBwcm9ncmVzcykgKyAnKSBzY2FsZSgnICsgKHNjYWxlICogcHJvZ3Jlc3MpICsgJyknKTtcclxuICAgIFxyXG4gICAgICAgICAgICBpZiAoc3RlcCA8IHN0ZXBzKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgc3RlcCArIDEsIHN0ZXBzKTtcclxuICAgICAgICAgICAgICAgIH0sIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgKi9cclxuICAgIGZ1bmN0aW9uIHN0aWNrTm9kZShkKSB7XHJcbiAgICAgICAgZC5meCA9IGQzLmV2ZW50Lng7XHJcbiAgICAgICAgZC5meSA9IGQzLmV2ZW50Lnk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGljaygpIHtcclxuICAgICAgICB0aWNrTm9kZXMoKTtcclxuICAgICAgICB0aWNrUmVsYXRpb25zaGlwcygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tOb2RlcygpIHtcclxuICAgICAgICBpZiAobm9kZSkge1xyXG4gICAgICAgICAgICBub2RlLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgZC54ICsgJywgJyArIGQueSArICcpJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzKCkge1xyXG4gICAgICAgIGlmIChyZWxhdGlvbnNoaXApIHtcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uIChkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYW5nbGUgPSByb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQuc291cmNlLnggKyAnLCAnICsgZC5zb3VyY2UueSArICcpIHJvdGF0ZSgnICsgYW5nbGUgKyAnKSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGlja1JlbGF0aW9uc2hpcHNUZXh0cygpO1xyXG4gICAgICAgICAgICB0aWNrUmVsYXRpb25zaGlwc091dGxpbmVzKCk7XHJcbiAgICAgICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzT3ZlcmxheXMoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdXRsaW5lcygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXAuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciByZWwgPSBkMy5zZWxlY3QodGhpcyksXHJcbiAgICAgICAgICAgICAgICBvdXRsaW5lID0gcmVsLnNlbGVjdCgnLm91dGxpbmUnKSxcclxuICAgICAgICAgICAgICAgIHRleHQgPSByZWwuc2VsZWN0KCcudGV4dCcpO1xyXG5cclxuICAgICAgICAgICAgb3V0bGluZS5hdHRyKCdkJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dEJvdW5kaW5nQm94ID0gdGV4dC5ub2RlKCkuZ2V0QkJveCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRQYWRkaW5nID0gNSxcclxuICAgICAgICAgICAgICAgICAgICB1ID0gdW5pdGFyeVZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRNYXJnaW4gPSB7IHg6IChkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtICh0ZXh0Qm91bmRpbmdCb3gud2lkdGggKyB0ZXh0UGFkZGluZykgKiB1LngpICogMC41LCB5OiAoZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAodGV4dEJvdW5kaW5nQm94LndpZHRoICsgdGV4dFBhZGRpbmcpICogdS55KSAqIDAuNSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG4gPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QTEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIG4ueCwgeTogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QjEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogdGV4dE1hcmdpbi54IC0gbi54LCB5OiB0ZXh0TWFyZ2luLnkgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEMxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IHRleHRNYXJnaW4ueCwgeTogdGV4dE1hcmdpbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnREMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRBMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIHRleHRNYXJnaW4ueCAtIG4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSB0ZXh0TWFyZ2luLnkgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEIyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54IC0gdS54ICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55IC0gdS55ICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEMyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54ICsgKG4ueCAtIHUueCkgKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgKyAobi55IC0gdS55KSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnREMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEUyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54ICsgKC0gbi54IC0gdS54KSAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSArICgtIG4ueSAtIHUueSkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RjIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSB1LnggKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSB1LnkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RzIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSB0ZXh0TWFyZ2luLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gdGV4dE1hcmdpbi55IH0sIGFuZ2xlKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QTEueCArICcgJyArIHJvdGF0ZWRQb2ludEExLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QjEueCArICcgJyArIHJvdGF0ZWRQb2ludEIxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QzEueCArICcgJyArIHJvdGF0ZWRQb2ludEMxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RDEueCArICcgJyArIHJvdGF0ZWRQb2ludEQxLnkgK1xyXG4gICAgICAgICAgICAgICAgICAgICcgWiBNICcgKyByb3RhdGVkUG9pbnRBMi54ICsgJyAnICsgcm90YXRlZFBvaW50QTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMi54ICsgJyAnICsgcm90YXRlZFBvaW50QjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMi54ICsgJyAnICsgcm90YXRlZFBvaW50QzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMi54ICsgJyAnICsgcm90YXRlZFBvaW50RDIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRFMi54ICsgJyAnICsgcm90YXRlZFBvaW50RTIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRGMi54ICsgJyAnICsgcm90YXRlZFBvaW50RjIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRHMi54ICsgJyAnICsgcm90YXRlZFBvaW50RzIueSArXHJcbiAgICAgICAgICAgICAgICAgICAgJyBaJztcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5LmF0dHIoJ2QnLCBmdW5jdGlvbiAoZCkge1xyXG4gICAgICAgICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICBuMSA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG4gPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCwgNTApLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwIC0gbi54LCB5OiAwIC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSBuLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEMgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggKyBuLnggLSBuMS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSArIG4ueSAtIG4xLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RCA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgbi54IC0gbjEueCwgeTogMCArIG4ueSAtIG4xLnkgfSwgYW5nbGUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuICdNICcgKyByb3RhdGVkUG9pbnRBLnggKyAnICcgKyByb3RhdGVkUG9pbnRBLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCLnggKyAnICcgKyByb3RhdGVkUG9pbnRCLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDLnggKyAnICcgKyByb3RhdGVkUG9pbnRDLnkgK1xyXG4gICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRELnggKyAnICcgKyByb3RhdGVkUG9pbnRELnkgK1xyXG4gICAgICAgICAgICAgICAgJyBaJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc1RleHRzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcFRleHQuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24gKGQpIHtcclxuICAgICAgICAgICAgdmFyIGFuZ2xlID0gKHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCkgKyAzNjApICUgMzYwLFxyXG4gICAgICAgICAgICAgICAgbWlycm9yID0gYW5nbGUgPiA5MCAmJiBhbmdsZSA8IDI3MCxcclxuICAgICAgICAgICAgICAgIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG5XZWlnaHQgPSBtaXJyb3IgPyAyIDogLTMsXHJcbiAgICAgICAgICAgICAgICBwb2ludCA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54KSAqIDAuNSArIG4ueCAqIG5XZWlnaHQsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSkgKiAwLjUgKyBuLnkgKiBuV2VpZ2h0IH0sXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnQgPSByb3RhdGVQb2ludChjZW50ZXIsIHBvaW50LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgcm90YXRlZFBvaW50LnggKyAnLCAnICsgcm90YXRlZFBvaW50LnkgKyAnKSByb3RhdGUoJyArIChtaXJyb3IgPyAxODAgOiAwKSArICcpJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0b1N0cmluZyhkKSB7XHJcbiAgICAgICAgdmFyIHMgPSBkLmxhYmVscyA/IGQubGFiZWxzWzBdIDogZC50eXBlO1xyXG5cclxuICAgICAgICBzICs9ICcgKDxpZD46ICcgKyBkLmlkO1xyXG5cclxuICAgICAgICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIHMgKz0gJywgJyArIHByb3BlcnR5ICsgJzogJyArIEpTT04uc3RyaW5naWZ5KGQucHJvcGVydGllc1twcm9wZXJ0eV0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBzICs9ICcpJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdW5pdGFyeU5vcm1hbFZlY3Rvcihzb3VyY2UsIHRhcmdldCwgbmV3TGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICB2ZWN0b3IgPSB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpO1xyXG5cclxuICAgICAgICByZXR1cm4gcm90YXRlUG9pbnQoY2VudGVyLCB2ZWN0b3IsIDkwKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRhcmdldC54IC0gc291cmNlLngsIDIpICsgTWF0aC5wb3codGFyZ2V0LnkgLSBzb3VyY2UueSwgMikpIC8gTWF0aC5zcXJ0KG5ld0xlbmd0aCB8fCAxKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogKHRhcmdldC54IC0gc291cmNlLngpIC8gbGVuZ3RoLFxyXG4gICAgICAgICAgICB5OiAodGFyZ2V0LnkgLSBzb3VyY2UueSkgLyBsZW5ndGgsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoRDNEYXRhKGQzRGF0YSkge1xyXG4gICAgICAgIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhkM0RhdGEubm9kZXMsIGQzRGF0YS5yZWxhdGlvbnNoaXBzLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xyXG4gICAgICAgIHZhciBkM0RhdGEgPSBuZW80akRhdGFUb0QzRGF0YShuZW80akRhdGEpO1xyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZDNEYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVJbmZvKGQpIHtcclxuICAgICAgICBjbGVhckluZm8oKTtcclxuXHJcbiAgICAgICAgaWYgKGQubGFiZWxzKSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoJ2NsYXNzJywgZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50UmVsYXRpb25zaGlwKCdjbGFzcycsIGQudHlwZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsICcmbHQ7aWQmZ3Q7JywgZC5pZCk7XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKGQucHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eSgncHJvcGVydHknLCBwcm9wZXJ0eSwgSlNPTi5zdHJpbmdpZnkoZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzKG4sIGFwcGVuZCkge1xyXG4gICAgICAgIGlmIChhcHBlbmQpIHtcclxuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkobm9kZXMsIG4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbm9kZSA9IHN2Z05vZGVzLnNlbGVjdEFsbCgnLm5vZGUnKVxyXG4gICAgICAgICAgICAuZGF0YShub2RlcywgZnVuY3Rpb24gKGQpIHsgcmV0dXJuIGQuaWQ7IH0pO1xyXG4gICAgICAgIHZhciBub2RlRW50ZXIgPSBhcHBlbmROb2RlVG9HcmFwaCgpO1xyXG4gICAgICAgIG5vZGUgPSBub2RlRW50ZXIubWVyZ2Uobm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlTm9kZXNBbmRSZWxhdGlvbnNoaXBzKG4sIHIsIGFwcGVuZCkge1xyXG4gICAgICAgIHVwZGF0ZVJlbGF0aW9uc2hpcHMociwgYXBwZW5kKTtcclxuICAgICAgICB1cGRhdGVOb2RlcyhuLCBhcHBlbmQpO1xyXG5cclxuICAgICAgICBzaW11bGF0aW9uLm5vZGVzKG5vZGVzKTtcclxuICAgICAgICBzaW11bGF0aW9uLmZvcmNlKCdsaW5rJykubGlua3MocmVsYXRpb25zaGlwcyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlUmVsYXRpb25zaGlwcyhyLCBhcHBlbmQpIHtcclxuICAgICAgICBpZiAoYXBwZW5kKSB7XHJcbiAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlbGF0aW9uc2hpcHMsIHIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwID0gc3ZnUmVsYXRpb25zaGlwcy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAnKVxyXG4gICAgICAgICAgICAuZGF0YShyZWxhdGlvbnNoaXBzLCBmdW5jdGlvbiAoZCkgeyByZXR1cm4gZC5pZDsgfSk7XHJcblxyXG4gICAgICAgIHZhciByZWxhdGlvbnNoaXBFbnRlciA9IGFwcGVuZFJlbGF0aW9uc2hpcFRvR3JhcGgoKTtcclxuXHJcbiAgICAgICAgcmVsYXRpb25zaGlwID0gcmVsYXRpb25zaGlwRW50ZXIucmVsYXRpb25zaGlwLm1lcmdlKHJlbGF0aW9uc2hpcCk7XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcE91dGxpbmUgPSBzdmcuc2VsZWN0QWxsKCcucmVsYXRpb25zaGlwIC5vdXRsaW5lJyk7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3V0bGluZSA9IHJlbGF0aW9uc2hpcEVudGVyLm91dGxpbmUubWVyZ2UocmVsYXRpb25zaGlwT3V0bGluZSk7XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcE92ZXJsYXkgPSBzdmcuc2VsZWN0QWxsKCcucmVsYXRpb25zaGlwIC5vdmVybGF5Jyk7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwT3ZlcmxheSA9IHJlbGF0aW9uc2hpcEVudGVyLm92ZXJsYXkubWVyZ2UocmVsYXRpb25zaGlwT3ZlcmxheSk7XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcFRleHQgPSBzdmcuc2VsZWN0QWxsKCcucmVsYXRpb25zaGlwIC50ZXh0Jyk7XHJcbiAgICAgICAgcmVsYXRpb25zaGlwVGV4dCA9IHJlbGF0aW9uc2hpcEVudGVyLnRleHQubWVyZ2UocmVsYXRpb25zaGlwVGV4dCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdmVyc2lvbigpIHtcclxuICAgICAgICByZXR1cm4gVkVSU0lPTjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB6b29tRml0KHRyYW5zaXRpb25EdXJhdGlvbikge1xyXG4gICAgICAgIHZhciBib3VuZHMgPSBzdmcubm9kZSgpLmdldEJCb3goKSxcclxuICAgICAgICAgICAgcGFyZW50ID0gc3ZnLm5vZGUoKS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQsXHJcbiAgICAgICAgICAgIGZ1bGxXaWR0aCA9IHBhcmVudC5jbGllbnRXaWR0aCxcclxuICAgICAgICAgICAgZnVsbEhlaWdodCA9IHBhcmVudC5jbGllbnRIZWlnaHQsXHJcbiAgICAgICAgICAgIHdpZHRoID0gYm91bmRzLndpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQgPSBib3VuZHMuaGVpZ2h0LFxyXG4gICAgICAgICAgICBtaWRYID0gYm91bmRzLnggKyB3aWR0aCAvIDIsXHJcbiAgICAgICAgICAgIG1pZFkgPSBib3VuZHMueSArIGhlaWdodCAvIDI7XHJcblxyXG4gICAgICAgIGlmICh3aWR0aCA9PT0gMCB8fCBoZWlnaHQgPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuOyAvLyBub3RoaW5nIHRvIGZpdFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3ZnU2NhbGUgPSAwLjg1IC8gTWF0aC5tYXgod2lkdGggLyBmdWxsV2lkdGgsIGhlaWdodCAvIGZ1bGxIZWlnaHQpO1xyXG4gICAgICAgIHN2Z1RyYW5zbGF0ZSA9IFtmdWxsV2lkdGggLyAyIC0gc3ZnU2NhbGUgKiBtaWRYLCBmdWxsSGVpZ2h0IC8gMiAtIHN2Z1NjYWxlICogbWlkWV07XHJcblxyXG4gICAgICAgIHN2Zy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBzdmdUcmFuc2xhdGVbMF0gKyAnLCAnICsgc3ZnVHJhbnNsYXRlWzFdICsgJykgc2NhbGUoJyArIHN2Z1NjYWxlICsgJyknKTtcclxuICAgICAgICAvLyAgICAgICAgc21vb3RoVHJhbnNmb3JtKHN2Z1RyYW5zbGF0ZSwgc3ZnU2NhbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlc2V0V2l0aE5lbzRqRGF0YShuZW80akRhdGEpIHtcclxuICAgICAgICB2YXIgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oX29wdGlvbnMsIHsgbmVvNGpEYXRhOiBuZW80akRhdGEsIG5lbzRqRGF0YVVybDogdW5kZWZpbmVkIH0pO1xyXG4gICAgICAgIGluaXQoX3NlbGVjdG9yLCBuZXdPcHRpb25zKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlKHNvdXJjZU5vZGUpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXBzID0gcmVsYXRpb25zaGlwcy5maWx0ZXIoZnVuY3Rpb24gKHJlbGF0aW9uc2hpcCkge1xyXG4gICAgICAgICAgICBpZiAocmVsYXRpb25zaGlwLnNvdXJjZSA9PT0gc291cmNlTm9kZSB8fCByZWxhdGlvbnNoaXAudGFyZ2V0ID09PSBzb3VyY2VOb2RlKSB7XHJcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QoXCIjXCIgKyByZWxhdGlvbnNoaXAudXVpZCkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIG5vZGVzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBub2RlICE9PSBzb3VyY2VOb2RlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBkMy5zZWxlY3QoXCIjXCIgKyBzb3VyY2VOb2RlLnV1aWQpLnJlbW92ZSgpO1xyXG4gICAgICAgIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhub2RlcywgcmVsYXRpb25zaGlwcywgZmFsc2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGd1aWQoKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gczQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxyXG4gICAgICAgICAgICAgICAgLnRvU3RyaW5nKDE2KVxyXG4gICAgICAgICAgICAgICAgLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuICdnJyArIHM0KCkgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArIHM0KCkgKyBzNCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGluaXQoX3NlbGVjdG9yLCBfb3B0aW9ucyk7XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlVmlld3Moa2V5cykge1xyXG4gICAgICAgIGQzLnNlbGVjdEFsbChcIi52aWV3c1wiKS5yZW1vdmUoKTtcclxuICAgICAgICB2YXIgY2lyY2xlcyA9IGQzLnNlbGVjdCgnc3ZnJykuc2VsZWN0QWxsKCdyZWN0LnZpZXdzJykuZGF0YShrZXlzKTtcclxuICAgICAgICB2YXIgciA9IDIwO1xyXG4gICAgICAgIGNpcmNsZXMuZW50ZXIoKS5hcHBlbmQoJ3JlY3QnKS5jbGFzc2VkKCd2aWV3cycsIHRydWUpXHJcbiAgICAgICAgICAgIC5hdHRyKCd4JywgcilcclxuICAgICAgICAgICAgLmF0dHIoJ3knLCBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChrZXlzLmluZGV4T2Yobm9kZSkgKyAxKSAqIDIuMiAqIHIgKyAyNztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3J4JywgciAvIDMpXHJcbiAgICAgICAgICAgIC5hdHRyKCdyeCcsIHIgLyAzKVxyXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCByICogNClcclxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIHIpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb2xvcnMoKVtrZXlzLmluZGV4T2Yobm9kZSkgKyAxXTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoJ3N0cm9rZScsIGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIjMDAwMDAwXCI7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hdHRyKCdzdHJva2Utd2lkdGgnLCBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiMC41cHhcIjtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmF0dHIoXCJjdXJzb3JcIiwgXCJwb2ludGVyXCIpXHJcbiAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbiAobikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uVmlld3NDbGlja0hhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uVmlld3NDbGlja0hhbmRsZXIobik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblZpZXdzTW91c2VPdmVySGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25WaWV3c01vdXNlT3ZlckhhbmRsZXIobik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblZpZXdzTW91c2VMZWF2ZUhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uVmlld3NNb3VzZUxlYXZlSGFuZGxlcihuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHZhciB0ZXh0ID0gZDMuc2VsZWN0KCdzdmcnKS5zZWxlY3RBbGwoJ3RleHQudmlld3MnKS5kYXRhKGtleXMpO1xyXG4gICAgICAgIHRleHQuZW50ZXIoKS5hcHBlbmQoJ3RleHQnKS5jbGFzc2VkKCd2aWV3cycsIHRydWUpXHJcbiAgICAgICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdsZWZ0JylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZvbnQtd2VpZ2h0JywgJ2JvbGQnKVxyXG4gICAgICAgICAgICAuYXR0cignc3Ryb2tlLXdpZHRoJywgJzAnKVxyXG4gICAgICAgICAgICAuYXR0cignc3Ryb2tlLWNvbG9yJywgJ3doaXRlJylcclxuICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnIzY5Njk2OScpXHJcbiAgICAgICAgICAgIC5hdHRyKCd4JywgMiAqIHIpXHJcbiAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCBcIjEwcHhcIilcclxuICAgICAgICAgICAgLmF0dHIoXCJjdXJzb3JcIiwgXCJwb2ludGVyXCIpXHJcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgICAgICAgICAgfSkuYXR0cigneScsIGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKGtleXMuaW5kZXhPZihub2RlKSArIDEpICogMi4yICogciArIDQwO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblZpZXdzQ2xpY2tIYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblZpZXdzQ2xpY2tIYW5kbGVyKG4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25WaWV3c01vdXNlT3ZlckhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uVmlld3NNb3VzZU92ZXJIYW5kbGVyKG4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbiAobikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uVmlld3NNb3VzZUxlYXZlSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25WaWV3c01vdXNlTGVhdmVIYW5kbGVyKG4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2lyY2xlcy5leGl0KCkucmVtb3ZlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGlnaGxpZ2h0Tm9kZXMobm9kZXMpIHtcclxuICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgIGQzLnNlbGVjdChcIiNcIiArIG5vZGUudXVpZClcclxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKCdub2RlLWhpZ2hsaWdodGVkJywgdHJ1ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdW5IaWdobGlnaHROb2Rlcyhub2Rlcykge1xyXG4gICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgZDMuc2VsZWN0KFwiI1wiICsgbm9kZS51dWlkKVxyXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoJ25vZGUtaGlnaGxpZ2h0ZWQnLCBmYWxzZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gb3JpZW50Rm9yY2VHcmFwaFZlcnRpY2FsKHByaW9yaXRpZXMpIHtcclxuICAgICAgICBub2Rlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcmlvcml0aWVzW2EubGFiZWxzWzBdLnRvTG93ZXJDYXNlKCldIC0gcHJpb3JpdGllc1tiLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdmFyIHByaW9yaXR5ID0gMDtcclxuICAgICAgICB2YXIgeCA9IDcwMDtcclxuICAgICAgICB2YXIgeSA9IDIwMDtcclxuXHJcbiAgICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICBpZiAocHJpb3JpdGllc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXSAhPT0gcHJpb3JpdHkpIHtcclxuICAgICAgICAgICAgICAgIHByaW9yaXR5ID0gcHJpb3JpdGllc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXTtcclxuICAgICAgICAgICAgICAgIHkgKz0gMTMwO1xyXG4gICAgICAgICAgICAgICAgeCA9IDcwMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB4ICs9IDE1MDtcclxuXHJcbiAgICAgICAgICAgIG5vZGUuZnggPSB4O1xyXG4gICAgICAgICAgICBub2RlLmZ5ID0geTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBvcmllbnRGb3JjZUdyYXBoSG9yaXpvbnRhbChwcmlvcml0aWVzKSB7XHJcbiAgICAgICAgbm9kZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICByZXR1cm4gcHJpb3JpdGllc1thLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXSAtIHByaW9yaXRpZXNbYi5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHZhciBwcmlvcml0eSA9IDA7XHJcbiAgICAgICAgdmFyIHggPSA3MDA7XHJcbiAgICAgICAgdmFyIHkgPSAyMDA7XHJcblxyXG4gICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHByaW9yaXRpZXNbbm9kZS5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV0gIT09IHByaW9yaXR5KSB7XHJcbiAgICAgICAgICAgICAgICBwcmlvcml0eSA9IHByaW9yaXRpZXNbbm9kZS5sYWJlbHNbMF0udG9Mb3dlckNhc2UoKV07XHJcbiAgICAgICAgICAgICAgICB5ID0gMjAwO1xyXG4gICAgICAgICAgICAgICAgeCArPSAxNTA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgeSArPSAxNTA7XHJcbiAgICAgICAgICAgIG5vZGUuZnggPSB4O1xyXG4gICAgICAgICAgICBub2RlLmZ5ID0geTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRHcmFwaCgpIHtcclxuICAgICAgICByZXR1cm4geyAnbm9kZXMnOiBub2RlcywgJ3JlbGF0aW9uc2hpcHMnOiByZWxhdGlvbnNoaXBzIH07XHJcbiAgICB9XHJcblxyXG4gICAgXHJcbiAgICBmdW5jdGlvbiBleHBhbmROb2RlKGN1cnJlbnROb2RlKSB7XHJcblxyXG4gICAgICAgIHZhciBkYXRhID0ge1xyXG4gICAgICAgICAgICBub2RlczogW10sXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcHM6IFtdXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHMgPSBzaXplKCk7XHJcblxyXG4gICAgICAgIGN1cnJlbnROb2RlLnByZXZpb3VzLmZvckVhY2goZnVuY3Rpb24gKG4sIGkpIHtcclxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBub2RlXHJcbiAgICAgICAgICAgIHZhciBub2RlID0ge1xyXG4gICAgICAgICAgICAgICAgaWQ6IG4ubm9kZS5pZCxcclxuICAgICAgICAgICAgICAgIGxhYmVsczogbi5ub2RlLmxhYmVscyxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG4ubm9kZS5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgeDogY3VycmVudE5vZGUueCArIDkwLFxyXG4gICAgICAgICAgICAgICAgeTogY3VycmVudE5vZGUueSArIDkwLFxyXG4gICAgICAgICAgICAgICAgZng6IGN1cnJlbnROb2RlLmZ4ICsgOTAsXHJcbiAgICAgICAgICAgICAgICBmeTogY3VycmVudE5vZGUuZnkgKyA5MCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgZGF0YS5ub2Rlc1tkYXRhLm5vZGVzLmxlbmd0aF0gPSBub2RlO1xyXG5cclxuICAgICAgICAgICAgLy8gQ3JlYXRlIGxpbmsgZnJvbSBuZXcgbm9kZSB0byBpdHMgcGFyZW50XHJcbiAgICAgICAgICAgIGRhdGEucmVsYXRpb25zaGlwc1tkYXRhLnJlbGF0aW9uc2hpcHMubGVuZ3RoXSA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBuLmxpbmsuaWQsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBuLmxpbmsudHlwZSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG4ubGluay5wcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgc3RhcnROb2RlOiBub2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgZW5kTm9kZTogY3VycmVudE5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IG5vZGUuaWQsXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGN1cnJlbnROb2RlLmlkLFxyXG4gICAgICAgICAgICAgICAgbGlua251bTogcy5yZWxhdGlvbnNoaXBzICsgMSArIGlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmQgb3JpZ2luYWwgbGlua3MgXHJcblxyXG4gICAgICAgICAgICB2YXIgbGlua3MgPSByZWxhdGlvbnNoaXBzQ29weS5maWx0ZXIoZnVuY3Rpb24gKGxpbmspIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBsaW5rLnNvdXJjZS5pZCA9PT0gbm9kZS5pZCB8fCBsaW5rLnRhcmdldC5pZCA9PT0gbm9kZS5pZDtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBHZXQgbGlua3Mgb2YgdGhlIHBhcmVudCBub2RlXHJcbiAgICAgICAgICAgIHZhciBwYXJlbnRMaW5rcyA9IHJlbGF0aW9uc2hpcHMuZmlsdGVyKGZ1bmN0aW9uIChsaW5rKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGluay5zb3VyY2UgPT09IGN1cnJlbnROb2RlIHx8IGxpbmsudGFyZ2V0ID09PSBjdXJyZW50Tm9kZTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxpbmtzIHRvIHRoZSBuZXdseSBjcmVhdGVkIG5vZGVcclxuICAgICAgICAgICAgbGlua3MuZm9yRWFjaChmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudExpbmsgPSBwYXJlbnRMaW5rcy5maW5kKGZ1bmN0aW9uIChwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHAuaWQgPT09IGxpbmsuaWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50TGluaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5rLnNvdXJjZS5pZCA9PT0gbm9kZS5pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRMaW5rLnNvdXJjZSA9IG5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50TGluay50YXJnZXQgPSBub2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGN1cnJlbnROb2RlLmNvbGxhcHNlZCA9IGZhbHNlO1xyXG4gICAgICAgIGN1cnJlbnROb2RlLnByZXZpb3VzID0gW107XHJcblxyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29sbGFwc2VOb2RlKG5vZGUsIHJ1bGVzKSB7XHJcbiAgICAgICAgaWYgKCFydWxlc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbGlua3MgPSByZWxhdGlvbnNoaXBzLmZpbHRlcihmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICByZXR1cm4gbGluay5zb3VyY2UgPT09IG5vZGUgfHwgbGluay50YXJnZXQgPT09IG5vZGU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHZhciBwYXJlbnRMaW5rID0gbGlua3MuZmluZChmdW5jdGlvbiAobGluaykge1xyXG4gICAgICAgICAgICByZXR1cm4gcnVsZXMubGluay5pbmNsdWRlcyhsaW5rLnR5cGUudG9Mb3dlckNhc2UoKSkgICYmIGxpbmsudGFyZ2V0LmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpID09PSBydWxlc1tub2RlLmxhYmVsc1swXS50b0xvd2VyQ2FzZSgpXTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKCFwYXJlbnRMaW5rKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcGFyZW50TGluay50YXJnZXQuY29sbGFwc2VkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGlua3Muc3BsaWNlKGxpbmtzLmluZGV4T2YocGFyZW50TGluayksIDEpO1xyXG5cclxuICAgICAgICBpZiAoIXBhcmVudExpbmsudGFyZ2V0LnByZXZpb3VzKSB7XHJcbiAgICAgICAgICAgIHBhcmVudExpbmsudGFyZ2V0LnByZXZpb3VzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJlbnRMaW5rLnRhcmdldC5wcmV2aW91cy5wdXNoKHtcclxuICAgICAgICAgICAgbm9kZTogbm9kZSxcclxuICAgICAgICAgICAgbGluazogcGFyZW50TGlua1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsaW5rcy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5rKSB7XHJcbiAgICAgICAgICAgIGxpbmsuY29sbGFwc2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKGxpbmsuc291cmNlID09PSBub2RlKSB7XHJcbiAgICAgICAgICAgICAgICBsaW5rLnNvdXJjZSA9IHBhcmVudExpbmsudGFyZ2V0O1xyXG4gICAgICAgICAgICAgICAgbGluay5zdGFydE5vZGUgPSBwYXJlbnRMaW5rLnRhcmdldC5pZDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxpbmsudGFyZ2V0ID0gcGFyZW50TGluay50YXJnZXQ7XHJcbiAgICAgICAgICAgICAgICBsaW5rLmVuZE5vZGUgPSBwYXJlbnRMaW5rLnRhcmdldC5pZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZW1vdmVOb2RlKG5vZGUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlOiBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlLFxyXG4gICAgICAgIG5lbzRqRGF0YVRvRDNEYXRhOiBuZW80akRhdGFUb0QzRGF0YSxcclxuICAgICAgICByYW5kb21EM0RhdGE6IHJhbmRvbUQzRGF0YSxcclxuICAgICAgICBzaXplOiBzaXplLFxyXG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGE6IHVwZGF0ZVdpdGhEM0RhdGEsXHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YTogdXBkYXRlV2l0aE5lbzRqRGF0YSxcclxuICAgICAgICBhcHBlbmREYXRhVG9Ob2RlT3V0d2FyZDogYXBwZW5kRGF0YVRvTm9kZU91dHdhcmQsXHJcbiAgICAgICAgYXBwZW5kRGF0YVRvTm9kZUlud2FyZDogYXBwZW5kRGF0YVRvTm9kZUlud2FyZCxcclxuICAgICAgICByZXNldFdpdGhOZW80akRhdGE6IHJlc2V0V2l0aE5lbzRqRGF0YSxcclxuICAgICAgICByZW1vdmVOb2RlOiByZW1vdmVOb2RlLFxyXG4gICAgICAgIGNyZWF0ZVZpZXdzOiBjcmVhdGVWaWV3cyxcclxuICAgICAgICBoaWdobGlnaHROb2RlczogaGlnaGxpZ2h0Tm9kZXMsXHJcbiAgICAgICAgdW5IaWdobGlnaHROb2RlczogdW5IaWdobGlnaHROb2RlcyxcclxuICAgICAgICBvcmllbnRGb3JjZUdyYXBoVmVydGljYWw6IG9yaWVudEZvcmNlR3JhcGhWZXJ0aWNhbCxcclxuICAgICAgICBvcmllbnRGb3JjZUdyYXBoSG9yaXpvbnRhbDogb3JpZW50Rm9yY2VHcmFwaEhvcml6b250YWwsXHJcbiAgICAgICAgZ2V0R3JhcGg6IGdldEdyYXBoLFxyXG4gICAgICAgIGNvbGxhcHNlTm9kZTogY29sbGFwc2VOb2RlLFxyXG4gICAgICAgIGV4cGFuZE5vZGU6IGV4cGFuZE5vZGUsXHJcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvblxyXG4gICAgfTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOZW80akQzO1xyXG4iXX0=
