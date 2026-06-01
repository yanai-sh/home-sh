use lyon::{
    math::{point, Point},
    path::Path,
    tessellation::{BuffersBuilder, StrokeOptions, StrokeTessellator, StrokeVertex, VertexBuffers},
};
use js_sys::{Object, Reflect};
use wasm_bindgen::{prelude::*, JsCast};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const TAU: f64 = core::f64::consts::TAU;
const THEME_LIGHT: u32 = 1;
const PHASE_CAREER: f64 = 1.0;
const PHASE_PROJECTS: f64 = 2.0;
const PHASE_CONTACT: f64 = 3.0;

#[wasm_bindgen]
pub fn render_lattice(
    canvas: HtmlCanvasElement,
    width: f64,
    height: f64,
    mouse_x_norm: f64,
    mouse_y_norm: f64,
    time_ms: f64,
) -> Result<u32, JsValue> {
    let dpr = web_sys::window()
        .map(|window| window.device_pixel_ratio())
        .unwrap_or(1.0)
        .clamp(1.0, 2.0);

    let pixel_width = (width * dpr).max(1.0).round() as u32;
    let pixel_height = (height * dpr).max(1.0).round() as u32;
    canvas.set_width(pixel_width);
    canvas.set_height(pixel_height);

    let context = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("2d canvas context unavailable"))?
        .dyn_into::<CanvasRenderingContext2d>()?;

    context.set_transform(dpr, 0.0, 0.0, dpr, 0.0, 0.0)?;
    context.clear_rect(0.0, 0.0, width, height);
    context.set_fill_style_str("#0a0a0a");
    context.fill_rect(0.0, 0.0, width, height);

    let spacing = (width / 12.0).clamp(48.0, 96.0);
    let cols = (width / spacing).ceil() as u32 + 2;
    let rows = (height / spacing).ceil() as u32 + 2;
    let mut node_count = 0;

    // mouse_x_norm / mouse_y_norm are clamped to [0, 1] by the caller. Convert
    // to lattice coordinates so a node directly under the pointer experiences
    // the strongest pull.
    let mx = mouse_x_norm.clamp(0.0, 1.0) * cols as f64;
    let my = mouse_y_norm.clamp(0.0, 1.0) * rows as f64;
    // time_ms ticks at 1 ms/frame from performance.now(); 0.0008 rad/ms ≈
    // one full sin cycle per ~1.3 s, which reads as a slow lattice "breathe".
    let time_phase = time_ms * 0.0008;

    let mut path = Path::builder();

    for row in 0..rows {
        for col in 0..cols {
            let x = col as f64 * spacing - spacing * 0.5;
            let y = row as f64 * spacing - spacing * 0.5;

            // dy is dampened by 0.7 so the falloff stretches vertically a touch
            // — a circle in lattice space draws a slightly taller ellipse in
            // pixel space, which reads better under the cursor than a sphere.
            let dx = col as f64 - mx;
            let dy = (row as f64 - my) * 0.7;
            let mouse_falloff = (-(dx * dx + dy * dy) * 0.04).exp();
            // 10 px base lean + up to 18 px boost under the pointer (peaks at
            // 28 px). Tuned by eye; bump the second coefficient for a heavier
            // pull or drop the first for less ambient sway.
            let lean = ((row + col) as f64 * 0.73 + time_phase).sin() * (10.0 + mouse_falloff * 18.0);

            if col + 1 < cols {
                path.begin(point(x as f32, y as f32));
                path.line_to(point((x + spacing + lean) as f32, (y + lean * 0.25) as f32));
                path.end(false);
            }

            if row + 1 < rows {
                path.begin(point(x as f32, y as f32));
                path.line_to(point((x - lean * 0.2) as f32, (y + spacing) as f32));
                path.end(false);
            }

            node_count += 1;
        }
    }

    let path = path.build();
    let mut geometry: VertexBuffers<Point, u16> = VertexBuffers::new();
    let mut tessellator = StrokeTessellator::new();
    tessellator
        .tessellate_path(
            &path,
            &StrokeOptions::default().with_line_width(1.0),
            &mut BuffersBuilder::new(&mut geometry, |vertex: StrokeVertex| vertex.position()),
        )
        .map_err(|err| JsValue::from_str(&format!("lattice tessellation failed: {err:?}")))?;

    context.set_fill_style_str("rgba(47, 107, 255, 0.18)");
    for triangle in geometry.indices.chunks_exact(3) {
        let a = geometry.vertices[triangle[0] as usize];
        let b = geometry.vertices[triangle[1] as usize];
        let c = geometry.vertices[triangle[2] as usize];
        context.begin_path();
        context.move_to(a.x as f64, a.y as f64);
        context.line_to(b.x as f64, b.y as f64);
        context.line_to(c.x as f64, c.y as f64);
        context.close_path();
        context.fill();
    }

    context.set_fill_style_str("rgba(215, 185, 122, 0.52)");
    for row in 0..rows {
        for col in 0..cols {
            let x = col as f64 * spacing - spacing * 0.5;
            let y = row as f64 * spacing - spacing * 0.5;
            context.begin_path();
            context.arc(x, y, 1.3, 0.0, core::f64::consts::TAU)?;
            context.fill();
        }
    }

    Ok(node_count)
}

#[derive(Clone, Copy)]
struct Node {
    x_norm: f64,
    y_norm: f64,
    drift: f64,
    pulse: f64,
}

#[derive(Clone, Copy)]
struct Gate {
    x_norm: f64,
    y_norm: f64,
    width: f64,
    phase: f64,
}

struct Rng {
    state: u32,
}

impl Rng {
    fn new(seed: u32) -> Self {
        Self {
            state: seed.max(1),
        }
    }

    fn next(&mut self) -> f64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x.max(1);
        x as f64 / u32::MAX as f64
    }
}

fn mix(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t.clamp(0.0, 1.0)
}

fn color_rgba(dark: (u8, u8, u8), light: (u8, u8, u8), alpha: f64, theme: f64) -> String {
    let r = mix(dark.0 as f64, light.0 as f64, theme).round() as u8;
    let g = mix(dark.1 as f64, light.1 as f64, theme).round() as u8;
    let b = mix(dark.2 as f64, light.2 as f64, theme).round() as u8;
    format!("rgba({r}, {g}, {b}, {:.3})", alpha.clamp(0.0, 1.0))
}

fn phase_weight(current: f64, target: f64) -> f64 {
    (1.0 - (current - target).abs()).clamp(0.0, 1.0)
}

#[wasm_bindgen]
pub struct SystemsFieldRenderer {
    canvas: HtmlCanvasElement,
    context: CanvasRenderingContext2d,
    seed: u32,
    quality: u32,
    width: f64,
    height: f64,
    dpr: f64,
    pointer_x: f64,
    pointer_y: f64,
    theme: f64,
    target_theme: f64,
    page_phase: f64,
    target_page_phase: f64,
    nodes: Vec<Node>,
    gates: Vec<Gate>,
    frame_count: u32,
    last_render_ms: f64,
    disposed: bool,
}

#[wasm_bindgen]
impl SystemsFieldRenderer {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas: HtmlCanvasElement, seed: u32, quality: u32) -> Result<SystemsFieldRenderer, JsValue> {
        let context = canvas
            .get_context("2d")?
            .ok_or_else(|| JsValue::from_str("2d canvas context unavailable"))?
            .dyn_into::<CanvasRenderingContext2d>()?;

        Ok(Self {
            canvas,
            context,
            seed,
            quality: quality.clamp(1, 3),
            width: 0.0,
            height: 0.0,
            dpr: 1.0,
            pointer_x: 0.5,
            pointer_y: 0.42,
            theme: 0.0,
            target_theme: 0.0,
            page_phase: 0.0,
            target_page_phase: 0.0,
            nodes: Vec::new(),
            gates: Vec::new(),
            frame_count: 0,
            last_render_ms: 0.0,
            disposed: false,
        })
    }

    pub fn resize(&mut self, width: f64, height: f64, dpr: f64) -> Result<(), JsValue> {
        let next_width = width.max(1.0);
        let next_height = height.max(1.0);
        let next_dpr = dpr.clamp(1.0, 1.75);
        let layout_changed = (next_width - self.width).abs() > 4.0
            || (next_height - self.height).abs() > 4.0
            || (next_dpr - self.dpr).abs() > 0.05;

        self.width = next_width;
        self.height = next_height;
        self.dpr = next_dpr;

        let pixel_width = (self.width * self.dpr).round() as u32;
        let pixel_height = (self.height * self.dpr).round() as u32;
        if self.canvas.width() != pixel_width {
            self.canvas.set_width(pixel_width);
        }
        if self.canvas.height() != pixel_height {
            self.canvas.set_height(pixel_height);
        }
        self.context
            .set_transform(self.dpr, 0.0, 0.0, self.dpr, 0.0, 0.0)?;

        if layout_changed || self.nodes.is_empty() {
            self.generate_layout();
        }

        Ok(())
    }

    pub fn set_pointer(&mut self, x: f64, y: f64) {
        self.pointer_x = x.clamp(0.0, 1.0);
        self.pointer_y = y.clamp(0.0, 1.0);
    }

    pub fn set_theme(&mut self, theme: u32) {
        self.target_theme = if theme == THEME_LIGHT { 1.0 } else { 0.0 };
    }

    pub fn set_page_phase(&mut self, phase: u32) {
        self.target_page_phase = (phase.min(3)) as f64;
    }

    pub fn render(&mut self, time_ms: f64) -> Result<u32, JsValue> {
        if self.disposed || self.width <= 0.0 || self.height <= 0.0 {
            return Ok(0);
        }

        let started = js_sys::Date::now();
        if self.frame_count == 0 {
            self.theme = self.target_theme;
            self.page_phase = self.target_page_phase;
        } else {
            self.theme = mix(self.theme, self.target_theme, 0.075);
            self.page_phase = mix(self.page_phase, self.target_page_phase, 0.08);
        }
        self.draw(time_ms)?;
        self.last_render_ms = js_sys::Date::now() - started;
        self.frame_count = self.frame_count.wrapping_add(1);
        Ok(self.nodes.len() as u32)
    }

    pub fn metrics(&self) -> Result<JsValue, JsValue> {
        let object = Object::new();
        Reflect::set(&object, &"quality".into(), &self.quality.into())?;
        Reflect::set(&object, &"dpr".into(), &self.dpr.into())?;
        Reflect::set(&object, &"nodeCount".into(), &(self.nodes.len() as u32).into())?;
        Reflect::set(&object, &"renderMs".into(), &self.last_render_ms.into())?;
        Reflect::set(&object, &"theme".into(), &self.theme.into())?;
        Reflect::set(&object, &"pagePhase".into(), &self.page_phase.into())?;
        Ok(object.into())
    }

    pub fn dispose(&mut self) {
        self.disposed = true;
        self.nodes.clear();
        self.gates.clear();
        self.context.clear_rect(0.0, 0.0, self.width, self.height);
    }
}

impl SystemsFieldRenderer {
    fn generate_layout(&mut self) {
        let spacing = match self.quality {
            1 => (self.width / 8.0).clamp(92.0, 140.0),
            2 => (self.width / 11.0).clamp(68.0, 112.0),
            _ => (self.width / 14.0).clamp(52.0, 92.0),
        };
        let cols = (self.width / spacing).ceil() as u32 + 3;
        let rows = (self.height / spacing).ceil() as u32 + 3;
        let mut rng = Rng::new(self.seed ^ (self.quality * 0x9e37_79b9) ^ cols ^ (rows << 8));

        self.nodes.clear();
        self.nodes.reserve((cols * rows) as usize);
        for row in 0..rows {
            for col in 0..cols {
                let jitter_x = (rng.next() - 0.5) * spacing * 0.24;
                let jitter_y = (rng.next() - 0.5) * spacing * 0.2;
                let x = col as f64 * spacing - spacing + jitter_x;
                let y = row as f64 * spacing - spacing + jitter_y;
                self.nodes.push(Node {
                    x_norm: x / self.width.max(1.0),
                    y_norm: y / self.height.max(1.0),
                    drift: rng.next() * TAU,
                    pulse: rng.next() * TAU,
                });
            }
        }

        self.gates.clear();
        for index in 0..(3 + self.quality) {
            self.gates.push(Gate {
                x_norm: 0.16 + rng.next() * 0.72,
                y_norm: 0.14 + rng.next() * 0.62,
                width: 46.0 + rng.next() * 54.0,
                phase: index as f64 * 0.77 + rng.next() * TAU,
            });
        }
    }

    fn draw(&self, time_ms: f64) -> Result<(), JsValue> {
        let t = time_ms * 0.001;
        let career = phase_weight(self.page_phase, PHASE_CAREER);
        let projects = phase_weight(self.page_phase, PHASE_PROJECTS);
        let contact = phase_weight(self.page_phase, PHASE_CONTACT);
        let pulse_speed = 1.0 - contact * 0.34;
        let alpha_scale = 1.0 - contact * 0.22;
        let route_diagonal = projects * 34.0;
        let vertical_drift = career * 24.0;

        self.context.clear_rect(0.0, 0.0, self.width, self.height);
        self.context.set_fill_style_str(&color_rgba(
            (9, 14, 20),
            (247, 250, 255),
            mix(0.52, 0.42, self.theme),
            self.theme,
        ));
        self.context.fill_rect(0.0, 0.0, self.width, self.height);
        self.context.set_line_cap("round");

        for (index, node) in self.nodes.iter().enumerate() {
            let phase = t * 0.46 * pulse_speed + node.drift;
            let x = node.x_norm * self.width + phase.sin() * 9.0 + route_diagonal * 0.18;
            let y = node.y_norm * self.height + phase.cos() * 7.0 + vertical_drift;
            let pointer_dx = x / self.width.max(1.0) - self.pointer_x;
            let pointer_dy = y / self.height.max(1.0) - self.pointer_y;
            let pointer_pull = (-(pointer_dx * pointer_dx + pointer_dy * pointer_dy) * 16.0).exp();
            let pulse = ((t * 1.28 * pulse_speed + node.pulse).sin() + 1.0) * 0.5;

            if let Some(next) = self.nodes.get(index + 1) {
                let is_same_band = (next.y_norm - node.y_norm).abs() < 0.12;
                if is_same_band {
                    let nx = next.x_norm * self.width + phase.sin() * 5.0 + route_diagonal;
                    let ny = next.y_norm * self.height + (phase + 0.8).cos() * 5.0 + vertical_drift;
                    let alpha = (0.048 + pointer_pull * 0.12 + pulse * 0.032) * alpha_scale;
                    self.context
                        .set_stroke_style_str(&color_rgba((105, 151, 255), (31, 91, 204), alpha, self.theme));
                    self.context.set_line_width(1.0);
                    self.context.begin_path();
                    self.context.move_to(x, y);
                    self.context.line_to(nx, ny);
                    self.context.stroke();
                }
            }

            if projects > 0.08 && index % 5 == 0 {
                let alpha = (0.026 + pointer_pull * 0.048) * projects;
                self.context
                    .set_stroke_style_str(&color_rgba((129, 222, 190), (0, 126, 118), alpha, self.theme));
                self.context.begin_path();
                self.context.move_to(x, y);
                self.context.line_to(x + route_diagonal * 1.8, y + 42.0);
                self.context.stroke();
            }

            let radius = 0.8 + pointer_pull * 1.8 + pulse * 0.45;
            let node_alpha = (0.15 + pointer_pull * 0.34) * alpha_scale;
            self.context
                .set_fill_style_str(&color_rgba((233, 242, 255), (15, 43, 84), node_alpha, self.theme));
            self.context.begin_path();
            self.context.arc(x, y, radius, 0.0, TAU)?;
            self.context.fill();
        }

        for gate in &self.gates {
            let sweep = ((t * 0.72 * pulse_speed + gate.phase).sin() + 1.0) * 0.5;
            let x = gate.x_norm * self.width;
            let y = gate.y_norm * self.height + vertical_drift * 0.6;
            let width = gate.width + sweep * 28.0;
            self.context
                .set_stroke_style_str(&color_rgba((255, 205, 118), (179, 104, 22), 0.12 + sweep * 0.14, self.theme));
            self.context.set_line_width(1.15);
            self.context.stroke_rect(x, y, width, 10.0);
            self.context
                .set_fill_style_str(&color_rgba((255, 205, 118), (179, 104, 22), 0.055 + sweep * 0.08, self.theme));
            self.context.fill_rect(x, y, width * sweep, 10.0);
        }

        self.draw_vignette()
    }

    fn draw_vignette(&self) -> Result<(), JsValue> {
        let vignette = self.context.create_radial_gradient(
            self.width * 0.38,
            self.height * 0.32,
            self.width * 0.08,
            self.width * 0.5,
            self.height * 0.52,
            self.width.max(self.height) * 0.82,
        )?;
        let edge = color_rgba((4, 7, 10), (219, 228, 240), mix(0.62, 0.56, self.theme), self.theme);
        vignette.add_color_stop(0.0, &color_rgba((47, 107, 255), (47, 107, 255), 0.08, self.theme))?;
        vignette.add_color_stop(0.5, &color_rgba((21, 27, 34), (255, 255, 255), 0.12, self.theme))?;
        vignette.add_color_stop(1.0, &edge)?;
        self.context.set_fill_style_canvas_gradient(&vignette);
        self.context.fill_rect(0.0, 0.0, self.width, self.height);
        Ok(())
    }
}

#[wasm_bindgen]
pub fn render_systems_field(
    canvas: HtmlCanvasElement,
    width: f64,
    height: f64,
    pointer_x_norm: f64,
    pointer_y_norm: f64,
    time_ms: f64,
    render_options: u32,
) -> Result<u32, JsValue> {
    let quality = (render_options & 0b11).clamp(1, 3);
    let dpr = web_sys::window()
        .map(|window| window.device_pixel_ratio())
        .unwrap_or(1.0)
        .clamp(1.0, 1.75);

    let mut renderer = SystemsFieldRenderer::new(canvas, 0x59a1_f17d, quality)?;
    renderer.resize(width, height, dpr)?;
    renderer.set_pointer(pointer_x_norm, pointer_y_norm);
    renderer.set_theme(if render_options & 0b100 != 0 { THEME_LIGHT } else { 0 });
    renderer.theme = renderer.target_theme;
    renderer.render(time_ms)
}
