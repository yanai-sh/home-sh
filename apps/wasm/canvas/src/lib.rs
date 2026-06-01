use lyon::{
    math::{point, Point},
    path::Path,
    tessellation::{BuffersBuilder, StrokeOptions, StrokeTessellator, StrokeVertex, VertexBuffers},
};
use wasm_bindgen::{prelude::*, JsCast};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

const TAU: f64 = core::f64::consts::TAU;

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
    let dpr = web_sys::window()
        .map(|window| window.device_pixel_ratio())
        .unwrap_or(1.0)
        .clamp(1.0, 1.75);

    let pixel_width = (width * dpr).max(1.0).round() as u32;
    let pixel_height = (height * dpr).max(1.0).round() as u32;
    if canvas.width() != pixel_width {
        canvas.set_width(pixel_width);
    }
    if canvas.height() != pixel_height {
        canvas.set_height(pixel_height);
    }

    let context = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("2d canvas context unavailable"))?
        .dyn_into::<CanvasRenderingContext2d>()?;

    context.set_transform(dpr, 0.0, 0.0, dpr, 0.0, 0.0)?;
    context.clear_rect(0.0, 0.0, width, height);
    let tier = (render_options & 0b11).clamp(1, 3);
    let light_mode = render_options & 0b100 != 0;
    let base_fill = if light_mode {
        "rgba(247, 250, 255, 0.92)"
    } else {
        "rgba(9, 14, 20, 0.92)"
    };
    context.set_fill_style_str(base_fill);
    context.fill_rect(0.0, 0.0, width, height);

    let spacing = match tier {
        1 => (width / 9.0).clamp(72.0, 116.0),
        2 => (width / 12.0).clamp(58.0, 96.0),
        _ => (width / 15.0).clamp(46.0, 82.0),
    };
    let cols = (width / spacing).ceil() as u32 + 3;
    let rows = (height / spacing).ceil() as u32 + 3;
    let px = pointer_x_norm.clamp(0.0, 1.0) * width;
    let py = pointer_y_norm.clamp(0.0, 1.0) * height;
    let t = time_ms * 0.001;
    let mut node_count = 0;

    context.set_line_cap("round");
    context.set_line_width(1.0);

    for row in 0..rows {
        for col in 0..cols {
            let base_x = col as f64 * spacing - spacing;
            let base_y = row as f64 * spacing - spacing;
            let phase = t * 0.62 + row as f64 * 0.71 + col as f64 * 0.39;
            let drift = phase.sin() * spacing * 0.08;
            let x = base_x + drift;
            let y = base_y + phase.cos() * spacing * 0.05;
            let pointer_dx = (x - px) / width.max(1.0);
            let pointer_dy = (y - py) / height.max(1.0);
            let pointer_pull = (-(pointer_dx * pointer_dx + pointer_dy * pointer_dy) * 18.0).exp();
            let pulse = ((t * 1.4 + row as f64 * 0.6 + col as f64 * 0.2).sin() + 1.0) * 0.5;

            if col + 1 < cols {
                let nx = (col + 1) as f64 * spacing - spacing + phase.sin() * spacing * 0.05;
                let ny = base_y + (phase + 0.7).cos() * spacing * 0.04;
                let alpha = 0.055 + pointer_pull * 0.14 + pulse * 0.035;
                let stroke = if light_mode {
                    format!("rgba(31, 91, 204, {:.3})", alpha * 1.24)
                } else {
                    format!("rgba(105, 151, 255, {alpha:.3})")
                };
                context.set_stroke_style_str(&stroke);
                context.begin_path();
                context.move_to(x, y);
                context.line_to(nx, ny);
                context.stroke();
            }

            if row + 1 < rows && (row + col) % 2 == 0 {
                let nx = base_x + (phase + 0.5).sin() * spacing * 0.04;
                let ny = (row + 1) as f64 * spacing - spacing;
                let cross_alpha = 0.035 + pointer_pull * 0.09;
                let cross_stroke = if light_mode {
                    format!("rgba(0, 126, 118, {:.3})", cross_alpha * 1.18)
                } else {
                    format!("rgba(129, 222, 190, {cross_alpha:.3})")
                };
                context.set_stroke_style_str(&cross_stroke);
                context.begin_path();
                context.move_to(x, y);
                context.line_to(nx, ny);
                context.stroke();
            }

            let radius = 1.0 + pointer_pull * 2.0 + pulse * 0.7;
            let node_alpha = 0.22 + pointer_pull * 0.42;
            let node_fill = if light_mode {
                format!("rgba(15, 43, 84, {:.3})", node_alpha * 0.78)
            } else {
                format!("rgba(233, 242, 255, {node_alpha:.3})")
            };
            context.set_fill_style_str(&node_fill);
            context.begin_path();
            context.arc(x, y, radius, 0.0, TAU)?;
            context.fill();
            node_count += 1;
        }
    }

    let gate_count = 3 + tier;
    for index in 0..gate_count {
        let lane = index as f64 / gate_count as f64;
        let x = width * (0.2 + lane * 0.68);
        let y = height * (0.22 + ((index * 37) % 52) as f64 / 100.0);
        let sweep = ((t * 0.85 + index as f64 * 0.9).sin() + 1.0) * 0.5;
        let gate_width = 54.0 + sweep * 32.0;

        let gate_alpha = 0.16 + sweep * 0.18;
        let gate_stroke = if light_mode {
            format!("rgba(179, 104, 22, {:.3})", gate_alpha * 1.15)
        } else {
            format!("rgba(255, 205, 118, {gate_alpha:.3})")
        };
        context.set_stroke_style_str(&gate_stroke);
        context.set_line_width(1.25);
        context.stroke_rect(x, y, gate_width, 11.0);
        let gate_fill_alpha = 0.08 + sweep * 0.12;
        let gate_fill = if light_mode {
            format!("rgba(179, 104, 22, {:.3})", gate_fill_alpha * 0.9)
        } else {
            format!("rgba(255, 205, 118, {gate_fill_alpha:.3})")
        };
        context.set_fill_style_str(&gate_fill);
        context.fill_rect(x, y, gate_width * sweep, 11.0);
    }

    let vignette = context.create_radial_gradient(
        width * 0.38,
        height * 0.35,
        width * 0.08,
        width * 0.5,
        height * 0.5,
        width.max(height) * 0.8,
    )?;
    if light_mode {
        vignette.add_color_stop(0.0, "rgba(47, 107, 255, 0.10)")?;
        vignette.add_color_stop(0.46, "rgba(255, 255, 255, 0.18)")?;
        vignette.add_color_stop(1.0, "rgba(219, 228, 240, 0.68)")?;
    } else {
        vignette.add_color_stop(0.0, "rgba(47, 107, 255, 0.10)")?;
        vignette.add_color_stop(0.52, "rgba(21, 27, 34, 0.18)")?;
        vignette.add_color_stop(1.0, "rgba(4, 7, 10, 0.72)")?;
    }
    context.set_fill_style_canvas_gradient(&vignette);
    context.fill_rect(0.0, 0.0, width, height);

    Ok(node_count)
}
