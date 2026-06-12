use js_sys::{Object, Reflect};
use wasm_bindgen::{prelude::*, JsCast};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const TAU: f64 = core::f64::consts::TAU;
const THEME_LIGHT: u32 = 1;
const PHASE_CAREER: f64 = 1.0;
const PHASE_CONTACT: f64 = 3.0;

const FORM_IDLE: f64 = 0.0;
const FORM_FOCUS: f64 = 1.0;
const FORM_SENDING: f64 = 2.0;
const FORM_SUCCESS: f64 = 3.0;
const FORM_ERROR: f64 = 4.0;

const DOC_NONE: f64 = 0.0;
const DOC_LOADING: f64 = 1.0;
const DOC_READY: f64 = 2.0;
const DOC_ERROR: f64 = 3.0;

#[derive(Clone, Copy)]
struct Particle {
    x: f64,
    y: f64,
    prev_x: f64,
    prev_y: f64,
    speed: f64,
    tint: f64,
}

struct Rng {
    state: u32,
}

impl Rng {
    fn new(seed: u32) -> Self {
        Self { state: seed.max(1) }
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

fn flow_angle(nx: f64, ny: f64, t: f64) -> f64 {
    let x = nx * TAU * 1.35;
    let y = ny * TAU * 1.12;
    (x + t * 0.14).sin() * 1.65
        + (y - t * 0.11).cos() * 1.35
        + (x * 0.62 + y * 1.28 + t * 0.06).sin() * 0.95
        + (x * 1.9 - y * 1.4 + t * 0.04).cos() * 0.55
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
    split_progress: f64,
    split_target: f64,
    boot_progress: f64,
    focus_x: f64,
    focus_y: f64,
    focus_strength: f64,
    form_state: f64,
    target_form_state: f64,
    form_intensity: f64,
    target_form_intensity: f64,
    doc_state: f64,
    target_doc_state: f64,
    reveal: f64,
    target_reveal: f64,
    particles: Vec<Particle>,
    frame_count: u32,
    last_render_ms: f64,
    disposed: bool,
}

#[wasm_bindgen]
impl SystemsFieldRenderer {
    #[wasm_bindgen(constructor)]
    pub fn new(
        canvas: HtmlCanvasElement,
        seed: u32,
        quality: u32,
    ) -> Result<SystemsFieldRenderer, JsValue> {
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
            split_progress: 0.0,
            split_target: 0.0,
            boot_progress: 1.0,
            focus_x: 0.5,
            focus_y: 0.5,
            focus_strength: 0.0,
            form_state: 0.0,
            target_form_state: 0.0,
            form_intensity: 0.0,
            target_form_intensity: 0.0,
            doc_state: 0.0,
            target_doc_state: 0.0,
            reveal: 0.0,
            target_reveal: 0.0,
            particles: Vec::new(),
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

        if layout_changed || self.particles.is_empty() {
            self.seed_particles();
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

    pub fn set_split_progress(&mut self, progress: f64) {
        self.split_progress = progress.clamp(0.0, 1.0);
    }

    pub fn set_split_target(&mut self, target: u32) {
        self.split_target = if target == 1 { 1.0 } else { 0.0 };
    }

    pub fn set_boot_progress(&mut self, progress: f64) {
        self.boot_progress = progress.clamp(0.0, 1.0);
    }

    pub fn set_focus(&mut self, x: f64, y: f64, strength: f64) {
        self.focus_x = x.clamp(0.0, 1.0);
        self.focus_y = y.clamp(0.0, 1.0);
        self.focus_strength = strength.clamp(0.0, 1.0);
    }

    pub fn set_form_state(&mut self, state: u32) {
        self.target_form_state = (state.min(4)) as f64;
    }

    pub fn set_form_intensity(&mut self, intensity: f64) {
        self.target_form_intensity = intensity.clamp(0.0, 1.0);
    }

    pub fn set_doc_state(&mut self, state: u32) {
        self.target_doc_state = (state.min(3)) as f64;
    }

    pub fn set_reveal(&mut self, progress: f64) {
        self.target_reveal = progress.clamp(0.0, 1.0);
    }

    pub fn render(&mut self, time_ms: f64) -> Result<u32, JsValue> {
        if self.disposed || self.width <= 0.0 || self.height <= 0.0 {
            return Ok(0);
        }

        let started = js_sys::Date::now();
        if self.frame_count == 0 {
            self.theme = self.target_theme;
            self.page_phase = self.target_page_phase;
            self.form_state = self.target_form_state;
            self.form_intensity = self.target_form_intensity;
            self.doc_state = self.target_doc_state;
            self.reveal = self.target_reveal;
        } else {
            self.theme = mix(self.theme, self.target_theme, 0.075);
            self.page_phase = mix(self.page_phase, self.target_page_phase, 0.08);
            self.form_state = mix(self.form_state, self.target_form_state, 0.14);
            self.form_intensity = mix(self.form_intensity, self.target_form_intensity, 0.18);
            self.doc_state = mix(self.doc_state, self.target_doc_state, 0.12);
            self.reveal = mix(self.reveal, self.target_reveal, 0.11);
        }
        self.draw(time_ms)?;
        self.last_render_ms = js_sys::Date::now() - started;
        self.frame_count = self.frame_count.wrapping_add(1);
        Ok(self.particles.len() as u32)
    }

    pub fn metrics(&self) -> Result<JsValue, JsValue> {
        let object = Object::new();
        Reflect::set(&object, &"quality".into(), &self.quality.into())?;
        Reflect::set(&object, &"dpr".into(), &self.dpr.into())?;
        Reflect::set(
            &object,
            &"nodeCount".into(),
            &(self.particles.len() as u32).into(),
        )?;
        Reflect::set(&object, &"renderMs".into(), &self.last_render_ms.into())?;
        Reflect::set(&object, &"theme".into(), &self.theme.into())?;
        Reflect::set(&object, &"pagePhase".into(), &self.page_phase.into())?;
        Reflect::set(&object, &"splitProgress".into(), &self.split_progress.into())?;
        Ok(object.into())
    }

    pub fn dispose(&mut self) {
        self.disposed = true;
        self.particles.clear();
        self.context.clear_rect(0.0, 0.0, self.width, self.height);
    }
}

impl SystemsFieldRenderer {
    fn particle_count(&self) -> usize {
        match self.quality {
            1 => 160,
            2 => 300,
            _ => 480,
        }
    }

    fn seed_particles(&mut self) {
        let count = self.particle_count();
        let mut rng = Rng::new(self.seed ^ (self.quality * 0x9e37_79b9));
        self.particles.clear();
        self.particles.reserve(count);
        for _ in 0..count {
            let x = rng.next();
            let y = rng.next();
            self.particles.push(Particle {
                x,
                y,
                prev_x: x,
                prev_y: y,
                speed: 0.55 + rng.next() * 0.85,
                tint: rng.next(),
            });
        }
    }

    fn form_sending(&self) -> f64 {
        phase_weight(self.form_state, FORM_SENDING)
    }

    fn form_error(&self) -> f64 {
        phase_weight(self.form_state, FORM_ERROR)
    }

    fn form_success(&self) -> f64 {
        phase_weight(self.form_state, FORM_SUCCESS)
    }

    fn form_focus(&self) -> f64 {
        phase_weight(self.form_state, FORM_FOCUS)
    }

    fn doc_loading(&self) -> f64 {
        phase_weight(self.doc_state, DOC_LOADING)
    }

    fn doc_error(&self) -> f64 {
        phase_weight(self.doc_state, DOC_ERROR)
    }

    fn draw(&mut self, time_ms: f64) -> Result<(), JsValue> {
        let t = time_ms * 0.001;
        let career = phase_weight(self.page_phase, PHASE_CAREER);
        let contact = phase_weight(self.page_phase, PHASE_CONTACT);
        let boot_alpha = mix(0.25, 1.0, self.boot_progress);
        let split_left = mix(1.0, 0.42, self.split_progress);
        let split_pour = self.split_progress;

        let accent_blue = (47.0, 107.0, 255.0);
        let accent_cool = (58.0, 120.0, 220.0);
        let accent_warm = (255.0, 178.0, 92.0);
        let accent_error = (255.0, 120.0, 88.0);

        let mut accent_r = mix(accent_blue.0, accent_cool.0, career * 0.65);
        let mut accent_g = mix(accent_blue.1, accent_cool.1, career * 0.65);
        let mut accent_b = mix(accent_blue.2, accent_cool.2, career * 0.65);
        accent_r = mix(accent_r, accent_warm.0, contact * 0.55);
        accent_g = mix(accent_g, accent_warm.1, contact * 0.55);
        accent_b = mix(accent_b, accent_warm.2, contact * 0.55);
        accent_r = mix(accent_r, accent_error.0, self.form_error() * 0.45);
        accent_g = mix(accent_g, accent_error.1, self.form_error() * 0.45);
        accent_b = mix(accent_b, accent_error.2, self.form_error() * 0.45);

        let sending_pulse = if self.form_sending() > 0.05 {
            1.0 + (t * 4.0).sin() * 0.22 * self.form_sending()
        } else {
            1.0
        };

        let success_fade_boost = self.form_success() * 0.06;
        let reveal_lift = self.reveal * 0.85;

        // Ink-in-glass trails: resume = longer (lower fade), contact/success = shorter smear.
        let mut fade_alpha = mix(0.11, 0.08, self.theme) * boot_alpha;
        fade_alpha += career * 0.015;
        fade_alpha -= contact * 0.012;
        fade_alpha += success_fade_boost;
        fade_alpha -= self.doc_loading() * 0.018;
        fade_alpha = fade_alpha.clamp(0.06, 0.22);

        self.context.set_fill_style_str(&color_rgba(
            (4, 7, 10),
            (244, 247, 252),
            fade_alpha,
            self.theme,
        ));
        self.context.fill_rect(0.0, 0.0, self.width, self.height);

        let pointer_x = self.pointer_x;
        let pointer_y = self.pointer_y;
        let focus_x = self.focus_x;
        let focus_y = self.focus_y;
        let focus_strength = self.focus_strength;
        let intensity = self.form_intensity;
        let width = self.width;
        let height = self.height;
        let mut rng = Rng::new(self.seed ^ (self.frame_count as u32).wrapping_mul(0x85eb_ca6b));

        self.context.set_line_cap("round");

        let speed_scale_base = mix(0.00145, 0.00115, career);
        let speed_scale = speed_scale_base * sending_pulse;
        let form_focus_w = self.form_focus();
        let doc_dim = 1.0 - self.doc_loading() * 0.35;

        for particle in &mut self.particles {
            let nx = particle.x;
            let ny = particle.y;

            if self.split_progress > 0.02 && nx > split_left + 0.02 {
                respawn_particle_splash(particle, &mut rng, split_left);
                continue;
            }

            let mut angle = flow_angle(nx, ny, t);
            // Pour motion toward the detail pane as the split opens.
            angle += split_pour * 0.38;

            let pdx = nx - pointer_x;
            let pdy = ny - pointer_y;
            let pointer_dist = (pdx * pdx + pdy * pdy).sqrt();
            let pointer_pull = (-pointer_dist * pointer_dist * 28.0).exp();
            if pointer_pull > 0.001 {
                angle += (pointer_y - ny).atan2(pointer_x - nx) * pointer_pull * 0.85;
            }

            let fdx = nx - focus_x;
            let fdy = ny - focus_y;
            let focus_dist = (fdx * fdx + fdy * fdy).sqrt();
            let focus_pull = (-focus_dist * focus_dist * 22.0).exp() * focus_strength;
            if focus_pull > 0.001 {
                angle += (focus_x - nx).atan2(focus_y - ny) * focus_pull * 1.4;
            }

            let speed = particle.speed
                * speed_scale
                * (1.0 + pointer_pull * 1.2 + focus_pull * 0.9 + intensity * 0.35);
            let next_x = nx + angle.cos() * speed;
            let next_y = ny + angle.sin() * speed;

            let px = nx * width;
            let py = ny * height;
            let npx = next_x * width;
            let npy = next_y * height;

            let velocity = ((npx - px).powi(2) + (npy - py).powi(2)).sqrt();
            let wake = (pointer_pull * 0.75 + focus_pull * 0.65 + intensity * 0.4 + form_focus_w * 0.15)
                .clamp(0.0, 1.0);
            let mut line_alpha =
                (0.035 + wake * 0.24 + velocity * 0.016 + particle.tint * 0.025) * boot_alpha * doc_dim;
            line_alpha *= 1.0 + intensity * 0.35 + reveal_lift * 0.12;
            let line_width = 0.55 + wake * 1.2 + velocity * 0.035 + intensity * 0.25;

            let tint_mix = particle.tint * 0.3 + contact * 0.22 + career * 0.18;
            let stroke = color_rgba(
                (
                    (accent_r * (1.0 - tint_mix) + 129.0 * tint_mix).round() as u8,
                    (accent_g * (1.0 - tint_mix) + 222.0 * tint_mix).round() as u8,
                    (accent_b * (1.0 - tint_mix) + 190.0 * tint_mix).round() as u8,
                ),
                (
                    (accent_r * 0.35 + 16.0 * tint_mix).round() as u8,
                    (accent_g * 0.35 + 73.0 * tint_mix).round() as u8,
                    (accent_b * 0.35 + 184.0 * tint_mix).round() as u8,
                ),
                line_alpha,
                self.theme,
            );

            self.context.set_stroke_style_str(&stroke);
            self.context.set_line_width(line_width);
            self.context.begin_path();
            self.context.move_to(px, py);
            self.context.line_to(npx, npy);
            self.context.stroke();

            particle.prev_x = nx;
            particle.prev_y = ny;
            particle.x = next_x;
            particle.y = next_y;

            if next_x < -0.04 || next_x > 1.04 || next_y < -0.04 || next_y > 1.04 {
                respawn_particle_splash(particle, &mut rng, split_left);
            }
        }

        // Pointer bloom — scales with split pour and form intensity.
        let bloom_radius = (180.0 + split_pour * 90.0 + intensity * 70.0 + reveal_lift * 50.0)
            + (t * 1.2).sin() * 32.0;
        let bloom = self.context.create_radial_gradient(
            pointer_x * width,
            pointer_y * height,
            0.0,
            pointer_x * width,
            pointer_y * height,
            bloom_radius,
        )?;
        bloom.add_color_stop(
            0.0,
            &format!(
                "rgba({}, {}, {}, {:.3})",
                accent_r.round(),
                accent_g.round(),
                accent_b.round(),
                (0.1 + self.form_focus() * 0.06 + intensity * 0.05) * boot_alpha
            ),
        )?;
        bloom.add_color_stop(
            0.55,
            &color_rgba((129, 222, 190), (0, 126, 118), 0.035 * boot_alpha, self.theme),
        )?;
        bloom.add_color_stop(1.0, "rgba(0, 0, 0, 0)")?;
        self.context.set_fill_style_canvas_gradient(&bloom);
        self.context.fill_rect(0.0, 0.0, width, height);

        // Contact pane warmth on the detail (right) side.
        if contact > 0.05 || split_pour > 0.05 {
            let pane_x = mix(width * 0.62, width * 0.78, split_pour);
            let pane_bloom = self.context.create_radial_gradient(
                pane_x,
                height * 0.48,
                0.0,
                pane_x,
                height * 0.48,
                width * 0.42,
            )?;
            pane_bloom.add_color_stop(
                0.0,
                &format!(
                    "rgba({}, {}, {}, {:.3})",
                    accent_warm.0.round(),
                    accent_warm.1.round(),
                    accent_warm.2.round(),
                    (0.04 + contact * 0.07 + split_pour * 0.05) * boot_alpha
                ),
            )?;
            pane_bloom.add_color_stop(1.0, "rgba(0, 0, 0, 0)")?;
            self.context.set_fill_style_canvas_gradient(&pane_bloom);
            self.context.fill_rect(0.0, 0.0, width, height);
        }

        // PDF loading shimmer
        if self.doc_loading() > 0.05 {
            let shimmer = (t * 2.4).sin() * 0.5 + 0.5;
            let cool = (
                accent_cool.0.round() as u8,
                accent_cool.1.round() as u8,
                accent_cool.2.round() as u8,
            );
            self.context.set_fill_style_str(&color_rgba(
                cool,
                cool,
                shimmer * 0.025 * self.doc_loading() * boot_alpha,
                self.theme,
            ));
            self.context.fill_rect(0.0, 0.0, width, height);
        }

        if self.split_progress > 0.02 {
            let divider_x = split_left * width;
            self.context.set_fill_style_str(&format!(
                "rgba({}, {}, {}, {:.3})",
                accent_r.round(),
                accent_g.round(),
                accent_b.round(),
                0.05 + self.split_progress * 0.14 + reveal_lift * 0.04
            ));
            self.context
                .fill_rect(divider_x - 1.0, 0.0, 2.0 + self.split_progress * 2.5, height);
        }

        self.draw_vignette(accent_r, accent_g, accent_b)
    }

    fn draw_vignette(&self, accent_r: f64, accent_g: f64, accent_b: f64) -> Result<(), JsValue> {
        let lift = self.reveal * 0.12;
        let vignette = self.context.create_radial_gradient(
            self.width * 0.34,
            self.height * 0.28,
            self.width * (0.06 + lift),
            self.width * 0.5,
            self.height * 0.5,
            self.width.max(self.height) * (0.88 - lift * 0.15),
        )?;
        let edge = color_rgba(
            (4, 7, 10),
            (16, 22, 29),
            mix(0.28, 0.12, self.theme) - lift * 0.06,
            self.theme,
        );
        vignette.add_color_stop(
            0.0,
            &format!(
                "rgba({}, {}, {}, {:.3})",
                accent_r.round(),
                accent_g.round(),
                accent_b.round(),
                mix(0.04, 0.02, self.theme) + lift
            ),
        )?;
        vignette.add_color_stop(
            0.45,
            &color_rgba((21, 27, 34), (255, 255, 255), 0.0, self.theme),
        )?;
        vignette.add_color_stop(1.0, &edge)?;
        self.context.set_fill_style_canvas_gradient(&vignette);
        self.context.fill_rect(0.0, 0.0, self.width, self.height);
        Ok(())
    }
}

fn respawn_particle_splash(particle: &mut Particle, rng: &mut Rng, split_left: f64) {
    // Bias respawn to the splash (left) side; pour toward the pane as split opens.
    let max_x = (split_left - 0.06).clamp(0.12, 0.92);
    particle.x = rng.next() * max_x;
    particle.y = rng.next();
    particle.prev_x = particle.x;
    particle.prev_y = particle.y;
    particle.speed = 0.55 + rng.next() * 0.85;
    particle.tint = rng.next();
}
