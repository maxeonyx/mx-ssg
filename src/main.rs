use axum::{http::StatusCode, service, Router};
use clap::StructOpt;
use minidom::Element;
use std::{convert::{Infallible, TryInto}, fs, net::SocketAddr, path::{Path, PathBuf}, thread, time::Duration, error::Error, collections::HashMap, hash::Hash};
use tower_http::services::ServeDir;

mod cli;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {

    let config = cli::Args::parse();


    // tokio::task::spawn_blocking(move || {
    //     println!("listenning for changes: {}", CONTENT_DIR);
    //     let mut hotwatch = hotwatch::Hotwatch::new().expect("Watch failed to initialize!");
    //     hotwatch
    //         .watch(CONTENT_DIR, |_| {
    //             println!("Rebuilding site");
    //             rebuild_site(CONTENT_DIR, PUBLIC_DIR).expect("Rebuilding site");
    //         })
    //         .expect("Failed to watch content folder!");
    //     loop {
    //         thread::sleep(Duration::from_secs(1));
    //     }
    // });

    // let app = Router::new().nest(
    //     "/",
    //     service::get(ServeDir::new(PUBLIC_DIR)).handle_error(|error: std::io::Error| {
    //         Ok::<_, Infallible>((
    //             StatusCode::INTERNAL_SERVER_ERROR,
    //             format!("Unhandled internal error: {}", error),
    //         ))
    //     }),
    // );

    // let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    // println!("serving site on {}", addr);
    // axum::Server::bind(&addr)
    //     .serve(app.into_make_service())
    //     .await?;

    Ok(())
}

struct Site {
    files: HashMap<String, String>,
}

fn read_dir(dir: &str) -> Result<Vec<(String, String)>, Box<dyn Error>> {
    walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .map(|e| {
            let path = match e.path().to_str() {
                Some(s) => Ok(s.to_owned()),
                None => Err(MxError::FilenameNotSupported(e.path().display().to_string())),
            }?;
            let content = fs::read_to_string(&path)?;
            Ok((path, content))
        })
        .collect::<Result<Vec<_>, _>>()
}

fn build_site(config: cli::Args) -> Result<Site, Box<dyn Error>> {

    let content_files = read_dir(&config.content_dir)?;
    let template_files = read_dir(&config.templates_dir)?;
    
    let html = template_files
        .iter()
        .filter(|(path, content)| path.ends_with(".html"))
        .map(|(path, content)| (path, ))
        .collect::<Vec<_>>();

    use minidom::Element;

    let to_dom = |(path, content): &(String, String)| {

        let dom: Element = match path.ends_with(".md") {
            true => {
                let content = markdown_to_html_text(&content);
                content.parse()?
            },
            false => 
                content.parse()?
        };

        Ok((path.as_str(), dom))
    };

    let top_level_doms: HashMap<&str, Element> = content_files.iter().map(to_dom).collect()?;
    let template_doms = template_files.iter().map(to_dom).collect()?;

    let templated_top_level = top_level_doms.into_iter().map(|(path, dom)| {
        let templated = template_replacement(&template_doms, dom);
        (path, templated)
    })
    .collect::<Vec<_>>();

    Ok(Site { files: HashMap::new() })
}


fn template_replacement(templates: HashMap<&str, Element>, filename: &str, mut el: Element) -> Result<Element, Box<dyn Error>> {

    let filenamebase = PathBuf::from(filename).parent().expect("Filename didn't have a 'parent' component");
        
    if el.name() == "mx-use" {
        let src = el.attr("src").ok_or_else(|| MxError::NoSrcAttribute(filename.to_string()))?;
        
        let src = filenamebase.join(PathBuf::from(src)).canonicalize()?;

        let src = src.to_str().expect("Couldn't turn path back into string.");

        let template = templates.get(src).ok_or_else(|| MxError::DidNotFindTemplate(filename.to_string(), src.to_string()))?;

        let fills = el
            .children()
            .filter(|c| c.name() == "mx-fill")
            .map(|c| {
                let fill_slot_name = c.attr("slot").ok_or_else(|| MxError::FillTagNoSlot(filename.to_string()))?;
                let fill_contents = c.children();
                Ok((fill_slot_name, fill_contents))
            })
            .collect::<Result<HashMap<_, _>, _>>();
        let unnamed_fill = el
            .nodes()
            .filter(|n| {
                n.as_text().is_some()
                || n.as_element().map(|n| n.name() != "mx-fill").unwrap_or(true)
            });

        el = template.clone();

        let slots = el.
    }
}

fn to_template_map<'a>(templates: HashMap<&str, Element>) {
    templates.into_iter().map(|(s, el)| {

        el.

        for u in uses {
            let node = u.get(parser).unwrap();

            if let Some(children) = node.children() {
                let attrs = children.map(|c| {
                    c.get(parser).unwrap().
                });
            }
        }

        Vec::new()

    });

}

fn markdown_to_html_text(markdown_text: &str) -> String {

    let extension = comrak::ComrakExtensionOptions {
        strikethrough: true,
        tagfilter: false,
        table: true,
        autolink: true,
        tasklist: true,
        superscript: true,
        header_ids: Some("header-id-".to_owned()),
        footnotes: true,
        description_lists: false,
        front_matter_delimiter: Some("---".to_owned()),
    };

    let options = comrak::ComrakOptions {
        extension,
        parse: comrak::ComrakParseOptions {
            smart: true,
            default_info_string: Some("rust".to_string()),
        },
        render: comrak::ComrakRenderOptions {
            hardbreaks: false,
            github_pre_lang: true,
            unsafe_: true,
            ..comrak::ComrakRenderOptions::default()
        },
    };

    comrak::markdown_to_html(&markdown_text, &options)
}

#[derive(Debug)]
enum MxError {
    FilenameNotSupported(String),
    NoSrcAttribute(String),
    DidNotFindTemplate(String, String),
    DidNotFindSlot(String, String),
    FillTagNoSlot(String),
}

impl std::error::Error for MxError {}

impl std::fmt::Display for MxError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self {
            MxError::FilenameNotSupported(s) => writeln!(f, "Invalid filename provided (it contains invalid characters): {}", s),
            MxError::NoSrcAttribute(s) => writeln!(f, "You forgot to put a 'src' attribute on an mx-use element in {}", s),
            MxError::DidNotFindTemplate(file, src) => writeln!(f, "Couldn't find template '{}' in mx-use in {}", src, file),
            MxError::FillTagNoSlot(file, src) => writeln!(f, "mx-fill has not 'slot' attr in {}", src, file),
            MxError::DidNotFindSlot(file, src) => writeln!(f, "Couldn't find slot '{}' in mx-fill in {}", src, file),
        }
    }
}
