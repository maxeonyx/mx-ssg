use clap::Parser;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
pub struct Args {
    
    #[clap(short, long, default_value_t = String::from("content"))]
    pub content_dir: String,
    
    #[clap(short, long, default_value_t = String::from("public"))]
    pub output_dir: String,

    #[clap(short, long, default_value_t = String::from("templates"))]
    pub templates_dir: String,

    #[clap(long, default_value_t = String::from("mx"))]
    pub tag_prefix: String,

    #[clap(long)]
    pub no_build: bool,

    #[clap(long)]
    pub serve: bool,
}
