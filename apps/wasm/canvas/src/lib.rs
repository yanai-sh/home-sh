use lyon::{
    math::{point, Point},
    path::Path,
    tessellation::{BuffersBuilder, StrokeOptions, StrokeTessellator, StrokeVertex, VertexBuffers},
};
use wasm_bindgen::{prelude::*, JsCast};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

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
