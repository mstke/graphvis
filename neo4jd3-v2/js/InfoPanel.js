import { Colors } from './Colors';

export class InfoPanel {
    constructor(container) {
        this.info = container.append('div')
            .attr('class', 'neo4jd3-info');
    }

    updateInfo(item) {
        this.clearInfo();

        if (item.labels) {
            this.appendInfoElementClass('class', item.labels[0]);
        } else {
            this.appendInfoElementRelationship('class', item.type);
        }

        this.appendInfoElementProperty('property', '&lt;id&gt;', item.id);

        Object.keys(item.properties).forEach((property) => {
            this.appendInfoElementProperty('property', property, JSON.stringify(item.properties[property]));
        });
    }

    clearInfo() {
        this.info.html('');
    }

    appendInfoElement(cls, isNode, property, value) {
        var elem = this.info.append('a');

        elem.attr('href', '#')
            .attr('class', cls)
            .html('<strong>' + property + '</strong>' + (value ? (': ' + value) : ''));

        if (!value) {
            elem.style('background-color', () => {
                return isNode ? Colors.class2color(property) : Colors.relationshipColor;
            })
                .style('border-color', () => {
                    return Colors.defaultDarkenColor();
                })
                .style('color', () => {
                    return '#fff';
                });
        }
    }

    appendInfoElementClass(cls, node) {
        this.appendInfoElement(cls, true, node);
    }

    appendInfoElementProperty(cls, property, value) {
        this.appendInfoElement(cls, false, property, value);
    }

    appendInfoElementRelationship(cls, relationship) {
        this.appendInfoElement(cls, false, relationship);
    }
}