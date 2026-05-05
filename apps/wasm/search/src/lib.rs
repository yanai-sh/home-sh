use nucleo_matcher::{
    pattern::{Atom, AtomKind, CaseMatching, Normalization},
    Config, Matcher, Utf32Str,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Clone, Debug, Deserialize)]
pub struct SearchEntry {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub body: String,
    pub url: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct SearchHit {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub body: String,
    pub url: String,
    pub score: u32,
    pub match_positions: Vec<u32>,
}

#[wasm_bindgen]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct SearchIndex {
    entries: Vec<SearchEntry>,
    matcher: Matcher,
}

#[wasm_bindgen]
impl SearchIndex {
    #[wasm_bindgen(constructor)]
    pub fn new(entries: JsValue) -> Result<SearchIndex, JsValue> {
        let entries = serde_wasm_bindgen::from_value(entries)?;

        Ok(SearchIndex {
            entries,
            matcher: Matcher::new(Config::DEFAULT.match_paths()),
        })
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn search(&mut self, query: &str) -> Result<JsValue, JsValue> {
        let query = query.trim();
        if query.is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<SearchHit>::new())
                .map_err(|err| JsValue::from_str(&err.to_string()));
        }

        let atom = Atom::new(
            query,
            CaseMatching::Ignore,
            Normalization::Smart,
            AtomKind::Fuzzy,
            false,
        );
        let mut haystack_buf = Vec::new();
        let mut hits = Vec::new();

        for entry in &self.entries {
            haystack_buf.clear();
            let haystack_text = entry.search_text();
            let haystack = Utf32Str::new(&haystack_text, &mut haystack_buf);
            let mut indices = Vec::new();

            if let Some(score) = atom.indices(haystack, &mut self.matcher, &mut indices) {
                indices.sort_unstable();
                indices.dedup();
                hits.push(SearchHit {
                    id: entry.id.clone(),
                    kind: entry.kind.clone(),
                    title: entry.title.clone(),
                    body: entry.body.clone(),
                    url: entry.url.clone(),
                    score: score.into(),
                    match_positions: indices,
                });
            }
        }

        hits.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.title.cmp(&b.title)));
        hits.truncate(20);

        serde_wasm_bindgen::to_value(&hits).map_err(|err| JsValue::from_str(&err.to_string()))
    }
}

impl SearchEntry {
    fn search_text(&self) -> String {
        let mut text = String::with_capacity(
            self.title.len() + self.body.len() + self.tags.iter().map(String::len).sum::<usize>(),
        );
        text.push_str(&self.title);
        text.push(' ');
        text.push_str(&self.body);
        if !self.tags.is_empty() {
            text.push(' ');
            text.push_str(&self.tags.join(" "));
        }
        text
    }
}
