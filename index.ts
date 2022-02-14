import { HTMLElement, Node, parse } from 'node-html-parser';
import fs from 'fs';

function parse_file(name: string) {
    let text = fs.readFileSync('templates/src/' + name, 'utf8');

    let dom = parse(text);

    return dom;
}

function get_template(src: string): HTMLElement | undefined {
    return parse_file(src);
}

function do_templating(
    filename: string,
    doc: HTMLElement,
) {
    let i = 0;
    while (true) {
        i += 1;
        console.log('=================================================');
        console.log(`<!-- ${i} A -->`);
        // console.log(doc);
        console.log(doc.toString());

        let use_el = doc.getElementsByTagName('mx-use')[0] as HTMLElement;

        if (use_el === null) {
            console.log(`DONE`);
            return;
        }
        let parent = use_el.parentNode;
        console.log('USE EL');
        // console.log(use_el);
        console.log(use_el.toString());

        let fills_arr = use_el.querySelectorAll('> mx-fill');
        let fills: { [k: string]: HTMLElement } = {};
        for (let fill of fills_arr) {
            // remove the fills, they shouldn't be in the node anymore so that we can use everything else for the default slot
            fill.remove();
            let name = fill.getAttribute('name');
            if (name === undefined) {
                throw new Error(
                    `<mx-fill> has no 'name' attribute in ${filename}`,
                );
            }

            fills[name] = fill;
        }

        console.log(`<!-- ${i} B: Remember fills -->`);
        console.log(`${fills_arr.length + 1} fills`);
        console.log();

        let src = use_el.getAttribute('src');
        if (src === undefined) {
            throw new Error(`<mx-use> has no 'src' attribute in ${filename}`);
        }

        // would cache the templates but the library doesn't have a .clone() method
        let template = get_template(src);
        if (template === undefined) {
            throw new Error(`Couldn't find template "${src}" in ${filename}`);
        }

        console.log(`<!-- ${i} C: Load template "${src}" -->`);
        // console.log(template);
        console.log(template.toString());

        const idx = parent.childNodes.findIndex((child: Node) => {
            return child === use_el;
        });
        parent.childNodes = [
            ...parent.childNodes.slice(0, idx),
            ...template.childNodes,
            ...parent.childNodes.slice(idx + 1),
        ];

        console.log(`<!-- ${i} D: Replace use with template -->`);
        // console.log(doc);
        console.log(doc.toString());

        let slots = template.querySelectorAll('mx-slot');

        slots.forEach((slot_el: HTMLElement) => {
            let name = slot_el.getAttribute('name');

            let nodes = undefined;
            if (name === undefined) {
                if (use_el) { // will always succeed - deno has type inference error without this
                    nodes = use_el.childNodes;
                }
            } else {
                if (fills.hasOwnProperty(name)) {
                    nodes = fills[name].childNodes;
                }
            }

            if (nodes === undefined) {
                slot_el.remove();
            } else {
                slot_el.replaceWith(...nodes);
            }
        });

        console.log(`<!-- ${i} E: Replace slots with fills -->`);
        // console.log(doc);
        console.log(doc.toString());
    }
}

let docu = parse_file('index.html');
console.log('Before:');
console.log(docu.toString());

do_templating('index.html', docu);

console.log();

console.log('After:');
console.log(docu.toString());

// console.log(parse_file('layout.template.html'));
