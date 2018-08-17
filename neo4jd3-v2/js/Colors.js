import * as d3 from 'd3';

// Static properties
let colors = [
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

let classes2colors = {};
let numClasses = 0;
let relationshipColor = '#a5abb6';

export class Colors {

    static get colors() { return colors; }
    static get classes2colors() { return classes2colors; }
    static get relationshipColor() { return relationshipColor; }
    static get numClasses() { return numClasses; }
    static set numClasses(value) { numClasses = value; }

    static class2color(cls) {
        var color = Colors.classes2colors[cls];

        if (!color) {
            color = Colors.colors[this.numClasses % Colors.colors.length];
            Colors.classes2colors[cls] = color;
            Colors.numClasses++;
        }
        return color;
    }

    static class2darkenColor(cls) {
        return d3.rgb(Colors.class2color(cls)).darker(1);
    }

    static defaultDarkenColor() {
        return d3.rgb(Colors.colors[Colors.colors.length - 1]).darker(1);
    }
} 
