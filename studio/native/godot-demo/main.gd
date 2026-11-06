extends Node2D

var elapsed := 0.0

func _process(delta: float) -> void:
	elapsed += delta
	queue_redraw()

func _draw() -> void:
	draw_line(Vector2(70, 170), Vector2(410, 170), Color(0.25, 0.40, 0.48), 2.0)
	var x := 70.0 + 340.0 * ease(clampf(elapsed / 1.5, 0.0, 1.0), -2.0)
	draw_circle(Vector2(x, 170), 19.0, Color(0.17, 0.88, 0.72))
