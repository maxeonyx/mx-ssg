import { DomUtils, parseDocument } from 'htmlparser2';
import { Document, isTag, Element, Node } from 'domhandler';
import render from 'dom-serializer';
import fs from 'fs';

function parse_file(name: string): Document {
    let text = fs.readFileSync('templates/src/' + name, 'utf8');

    let dom = parseDocument(text);

    return dom;
}

function get_template(src: string): Document | undefined {
    return parse_file(src);
}

function do_templating(
    filename: string,
    doc: Document,
) {
    let i = 0;
    while (true) {
        i += 1;
        console.log('=================================================');
        console.log(`<!-- ${i} A -->`);
        console.log(render(doc));

        let use_els = DomUtils.getElementsByTagName("mx-use", doc)

        if (use_els.length === 0) {
            console.log(`DONE`);
            return;
        }
        let use_el = use_els[0];
        let parent = use_el.parentNode;
        // console.log('USE EL');
        // console.log(use_el);

        let fills_arr = DomUtils.getChildren(use_el).filter(c => isTag(c) && c.tagName == "mx-fill") as Element[]
        let fills: { [k: string]: Element } = {};
        for (let fill of fills_arr) {
            // remove the fills, they shouldn't be in the node anymore so that we can use everything else for the default slot
            DomUtils.removeElement(fill);
            let name = DomUtils.getAttributeValue(fill, "name");
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

        let src = DomUtils.getAttributeValue(use_el, "src");
        if (src === undefined) {
            throw new Error(`<mx-use> has no 'src' attribute in ${filename}`);
        }

        // would cache the templates but the library doesn't have a .clone() method
        let template = get_template(src);
        if (template === undefined) {
            throw new Error(`Couldn't find template "${src}" in ${filename}`);
        }

        console.log(`<!-- ${i} C: Load template "${src}" -->`);
        console.log(render(template));
        // console.log(template.toString());

        DomUtils.replaceElement(use_el, template);

        console.log(`<!-- ${i} D: Replace use with template -->`);
        console.log(render(doc));
        // console.log(doc.toString());

        let slots = DomUtils.getElementsByTagName('mx-slot', doc);

        slots.forEach((slot_el: Element) => {
            let name = DomUtils.getAttributeValue(slot_el, "name");

            let nodes: Node[] | undefined = undefined;
            if (name === undefined) {
                if (use_el) { // will always succeed - deno has type inference error without this
                    nodes = use_el.children;
                }
            } else {
                if (fills.hasOwnProperty(name)) {
                    nodes = fills[name].children;
                }
            }

            if (nodes !== undefined) {
                for (let node of nodes) {
                    DomUtils.append(slot_el, node);
                }
            }
            DomUtils.removeElement(slot_el);
        });

        console.log(`<!-- ${i} E: Replace slots with fills -->`);
        console.log(render(doc));
        // console.log(doc.toString());
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
