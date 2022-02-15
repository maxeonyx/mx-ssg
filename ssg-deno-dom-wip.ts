import {
    DOMParser,
    DOMParserMimeType,
    Element,
    HTMLDocument,
    NodeType,
} from 'https://deno.land/x/deno_dom@v0.1.21-alpha/deno-dom-wasm.ts';

function parse_file(name: string): HTMLDocument | null {
    let text = Deno.readTextFileSync('templates/src/' + name);

    return new DOMParser().parseFromString(text, 'text/html');
}

function do_templating(
    filename: string,
    doc: HTMLDocument,
) {
    let i = 0;
    while (true) {
        i += 1;

        let use_els = doc.getElementsByTagName('mx-use');
        if (use_els.length === 0) {
            console.log(`DONE`);
            return;
        }
        let use_el = use_els[0];

        let fills: { [k: string]: Element } = {};
        for (let use_child of use_el.childNodes) {
            if (use_child.nodeType == NodeType.ELEMENT_NODE && (use_child as Element).tagName === 'mx-fill') {
                let fill = use_child as Element;
                // remove the fills, they shouldn't be in the node anymore so that we can use everything else for the default slot
                fill.remove();
                let name = fill.getAttribute('name');
                if (name === null) {
                    throw new Error(
                        `<mx-fill> has no 'name' attribute in ${filename}`,
                    );
                }

                fills[name] = fill;
            }
        }

        console.log(`<!-- ${i} B: Remember fills -->`);
        console.log(`${Object.keys(fills).length + 1} fills`);
        console.log();

        let src = use_el.getAttribute('src');
        if (src === null) {
            throw new Error(`<mx-use> has no 'src' attribute in ${filename}`);
        }

        // would cache the templates but the library doesn't have a .clone() method
        let template = parse_file(src);
        if (template === null) {
            throw new Error(`Couldn't find template "${src}" in ${filename}`);
        }

        console.log(`<!-- ${i} C: Load template "${src}" -->`);
        console.log(template.textContent);
        // console.log(template.toString());

        DomUtils.replaceElement(use_el, template);

        console.log(`<!-- ${i} D: Replace use with template -->`);
        console.log(render(doc));
        // console.log(doc.toString());

        let slots = DomUtils.getElementsByTagName('mx-slot', doc);

        slots.forEach((slot_el: Element) => {
            let name = DomUtils.getAttributeValue(slot_el, 'name');

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
