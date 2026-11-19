extends Node3D
## Rave Studio — native companion (Godot 4.5, GL Compatibility).
## The canyon gate stage of the web studio, built from the same Blender assets (../assets/stage.glb,
## copied to res://stage.glb), audio-reactive through a spectrum analyser on the Master bus.
##
## Play:   godot --path . -- --track=/full/path/song.mp3 --bpm=138
## Movie:  godot --path . --write-movie /tmp/show.avi --fixed-fps 30 --quit-after 900 -- --track=/full/path/song.wav
## Without --track the show runs on a built-in 138 BPM clock (no sound) and cycles intro → build → drop → break.
## --start-bar=N: the clock (or the track's first sample) is bar N of that cycle (16 = build, 24 = drop).

const SEGMENTS := 24
const GATE_POS := Vector3(0.0, 9.2, -23.2)
const ORANGE := Color(1.0, 0.48, 0.1)
const BLUE := Color(0.2, 0.42, 1.0)

var bpm := 138.0
var start_bar := 0.0
var track_path := ""
var player: AudioStreamPlayer
var spectrum: AudioEffectSpectrumAnalyzerInstance
var t := 0.0
var beat := 0.0
var kick := 0.0
var bass := 0.0
var section := "intro"
var last_section := ""
var drop_age := 99.0
var panels: Array[MeshInstance3D] = []
var panel_dirs: Array[Vector3] = []
var ring_mat: StandardMaterial3D
var spill: OmniLight3D
var laser_mm: MultiMesh
var laser_origins: Array[Vector3] = []
var crowd_mat: ShaderMaterial
var cam: Camera3D
var shot := -1
var meshes := {}


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--bpm="):
			bpm = float(a.substr(6))
		elif a.begins_with("--track="):
			track_path = a.substr(8)
		elif a.begins_with("--start-bar="):
			start_bar = float(a.substr(12))
	_load_assets()
	_environment()
	_stage()
	_crowd()
	_lasers()
	cam = Camera3D.new()
	cam.fov = 52.0
	add_child(cam)
	_audio()


# ------------------------------------------------------------ assets (runtime glTF: no import step needed)
func _load_assets() -> void:
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var path := "res://stage.glb"
	if not FileAccess.file_exists(path):
		path = ProjectSettings.globalize_path("res://").path_join("../assets/stage.glb")
	if doc.append_from_file(path, state) != OK:
		push_warning("stage.glb not found; using primitives")
		return
	var root := doc.generate_scene(state)
	for n in root.find_children("*", "MeshInstance3D", true, false):
		meshes[n.name] = (n as MeshInstance3D).mesh
	root.free()


func _mesh(name: String, fallback: Mesh) -> Mesh:
	return meshes.get(name, fallback)


func _emissive(c: Color, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = c * energy
	return m


# ------------------------------------------------------------ sky, fog, glow, light
func _environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.04, 0.08, 0.22)
	sky_mat.sky_horizon_color = Color(0.62, 0.36, 0.24)
	sky_mat.ground_horizon_color = Color(0.2, 0.1, 0.06)
	sky_mat.ground_bottom_color = Color(0.03, 0.015, 0.01)
	sky_mat.sun_angle_max = 0.0
	var sky := Sky.new()
	sky.sky_material = sky_mat
	env.sky = sky
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.55
	env.glow_enabled = true
	env.glow_intensity = 1.1
	env.glow_bloom = 0.15
	env.glow_hdr_threshold = 0.85
	env.fog_enabled = true
	env.fog_light_color = Color(0.1, 0.11, 0.2)
	env.fog_density = 0.004
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.7, 0.48)
	sun.light_energy = 1.6
	sun.rotation_degrees = Vector3(-24.0, -62.0, 0.0)
	add_child(sun)
	spill = OmniLight3D.new()
	spill.light_color = ORANGE
	spill.omni_range = 70.0
	spill.position = Vector3(0.0, 9.0, -17.0)
	add_child(spill)


# ------------------------------------------------------------ ground, cliffs, deck, gate, towers
func _stage() -> void:
	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(600.0, 600.0)
	ground.mesh = pm
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.16, 0.08, 0.05)
	gm.roughness = 1.0
	ground.material_override = gm
	add_child(ground)
	for spec in [[Vector3(-62, 20, -60), 0.78, 44.0], [Vector3(66, 26, -34), -1.0, 56.0], [Vector3(-20, 13, -230), 0.05, 30.0]]:
		add_child(_cliff(spec[0], spec[1], spec[2]))
	var deck := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(36.0, 1.2, 11.0)
	deck.mesh = bm
	deck.position = Vector3(0.0, 0.6, -21.5)
	var dm := StandardMaterial3D.new()
	dm.albedo_color = Color(0.03, 0.032, 0.036)
	dm.metallic = 0.6
	dm.roughness = 0.55
	deck.material_override = dm
	add_child(deck)
	var gate := Node3D.new()
	gate.position = GATE_POS
	add_child(gate)
	var panel_mat := StandardMaterial3D.new()
	panel_mat.albedo_color = Color(0.35, 0.23, 0.15)
	panel_mat.metallic = 0.8
	panel_mat.roughness = 0.45
	for i in SEGMENTS:
		var key := "gate_panel_%02d" % i
		if not meshes.has(key):
			continue
		var mi := MeshInstance3D.new()
		mi.mesh = meshes[key]
		mi.material_override = panel_mat
		gate.add_child(mi)
		var c: Vector3 = mi.mesh.get_aabb().get_center()
		panels.append(mi)
		panel_dirs.append(Vector3(c.x, c.y, 0.0).normalized())
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 5.785
	tm.outer_radius = 5.935
	tm.rings = 160
	ring.mesh = tm
	ring.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	ring_mat = _emissive(ORANGE, 4.0)
	ring.material_override = ring_mat
	gate.add_child(ring)
	var disc := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 5.8
	cm.bottom_radius = 5.8
	cm.height = 0.05
	disc.mesh = cm
	disc.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	disc.position = Vector3(0.0, 0.0, -0.4)
	disc.material_override = _emissive(Color(0.02, 0.02, 0.03), 1.0)
	gate.add_child(disc)
	var truss: Mesh = _mesh("truss_seg", BoxMesh.new())
	var speaker: Mesh = _mesh("speaker", BoxMesh.new())
	var steel := StandardMaterial3D.new()
	steel.albedo_color = Color(0.4, 0.42, 0.45)
	steel.metallic = 0.9
	steel.roughness = 0.4
	for side in [-1.0, 1.0]:
		for k in 6:
			var tr := MeshInstance3D.new()
			tr.mesh = truss
			tr.material_override = steel
			tr.position = Vector3(side * 13.0, 1.2 + k * 2.0, -21.0)
			add_child(tr)
		for k in 10:
			var sp := MeshInstance3D.new()
			sp.mesh = speaker
			sp.position = Vector3(side * 10.6, 13.5 - k * 0.34, -19.8)
			sp.rotation = Vector3(-k * 0.035, side * -0.12, 0.0)
			add_child(sp)
	var booth := MeshInstance3D.new()
	booth.mesh = _mesh("booth", BoxMesh.new())
	booth.position = Vector3(0.0, 1.2, -19.0)
	add_child(booth)


func _cliff(pos: Vector3, rot_y: float, h: float) -> MeshInstance3D:
	var noise := FastNoiseLite.new()
	noise.seed = int(pos.x)
	noise.frequency = 0.03
	noise.fractal_octaves = 4
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var w := 220.0
	var nx := 110
	var ny := 40
	for j in ny:
		for i in nx:
			var quad := [Vector2(i, j), Vector2(i + 1, j), Vector2(i + 1, j + 1), Vector2(i, j), Vector2(i + 1, j + 1), Vector2(i, j + 1)]
			for q in quad:
				var x: float = (q.x / nx - 0.5) * w
				var y: float = (q.y / ny - 0.5) * h
				var z: float = noise.get_noise_2d(x, y) * 12.0 + pow((y + h * 0.5) / h, 2.0) * 8.0
				var band := 0.5 + 0.5 * sin(y * 0.55 + noise.get_noise_2d(x * 2.0, y) * 6.0)
				st.set_color(Color(0.23, 0.11, 0.06).lerp(Color(0.54, 0.29, 0.16), band))
				st.add_vertex(Vector3(x, y, z))
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = 0.95
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	mi.material_override = m
	mi.position = pos
	mi.rotation = Vector3(0.0, rot_y, 0.0)
	return mi


# ------------------------------------------------------------ crowd: one MultiMesh, arms and jumps in the shader
func _crowd() -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = _mesh("crowd_person", CapsuleMesh.new())
	mm.instance_count = 1800
	var rng := RandomNumberGenerator.new()
	rng.seed = 1984
	for i in mm.instance_count:
		var tz := pow(rng.randf(), 1.35)
		var z := -12.0 + tz * 46.0
		var x := rng.randf_range(-1.0, 1.0) * 21.0 * (0.7 + 0.3 * tz)
		var basis := Basis(Vector3.UP, atan2(-x, -21.0 - z) + rng.randf_range(-0.25, 0.25)).scaled(Vector3.ONE * rng.randf_range(0.9, 1.1))
		mm.set_instance_transform(i, Transform3D(basis, Vector3(x, 0.0, z)))
		mm.set_instance_custom_data(i, Color(rng.randf(), rng.randf(), rng.randf(), 0.0))
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode unshaded;
uniform float beat_phase;
uniform float jump;
uniform float arms;
uniform vec3 rim_a : source_color;
uniform vec3 rim_b : source_color;
varying float r;
void vertex() {
	vec4 c = INSTANCE_CUSTOM;
	r = c.x;
	vec3 p = VERTEX;
	float side = (abs(p.x) > 0.215 && p.y < 1.47 && p.y > 0.7) ? sign(p.x) : 0.0;
	if (side != 0.0) {
		vec2 sh = vec2(0.255 * side, 1.42);
		float a = -side * clamp(arms * (0.6 + 0.8 * c.z) - 0.1, 0.0, 1.0) * (2.7 + 0.25 * sin(TIME * 2.0 + c.x * 20.0));
		vec2 d = p.xy - sh;
		p.xy = sh + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
	}
	p.y += jump * max(0.0, sin(3.14159 * fract(beat_phase + c.z * 0.12))) * 0.3 * (0.55 + 0.45 * c.y);
	VERTEX = p;
}
void fragment() {
	float rim = pow(1.0 - abs(dot(NORMAL, VIEW)), 2.5);
	ALBEDO = vec3(0.012) + mix(rim_a, rim_b, step(0.5, r)) * rim * 0.9;
}
"""
	crowd_mat = ShaderMaterial.new()
	crowd_mat.shader = sh
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = crowd_mat
	add_child(mmi)


# ------------------------------------------------------------ lasers: additive cylinders from behind the booth
func _lasers() -> void:
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.025
	cyl.bottom_radius = 0.025
	cyl.height = 1.0
	cyl.radial_segments = 5
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.vertex_color_use_as_albedo = true
	m.no_depth_test = false
	cyl.material = m
	laser_mm = MultiMesh.new()
	laser_mm.transform_format = MultiMesh.TRANSFORM_3D
	laser_mm.use_colors = true
	laser_mm.mesh = cyl
	for k in 12:
		laser_origins.append(Vector3(0.0, 1.9, -20.4))
	for side in [-1.0, 1.0]:
		for k in 6:
			laser_origins.append(Vector3(side * 13.0, 13.4, -21.0))
	laser_mm.instance_count = laser_origins.size()
	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = laser_mm
	add_child(mmi)


# ------------------------------------------------------------ audio
func _audio() -> void:
	var bus := AudioServer.get_bus_index("Master")
	var an := AudioEffectSpectrumAnalyzer.new()
	an.buffer_length = 0.1
	AudioServer.add_bus_effect(bus, an)
	spectrum = AudioServer.get_bus_effect_instance(bus, AudioServer.get_bus_effect_count(bus) - 1)
	if track_path == "":
		return
	var stream: AudioStream = null
	var ext := track_path.get_extension().to_lower()
	if ext == "mp3":
		var s := AudioStreamMP3.new()
		s.data = FileAccess.get_file_as_bytes(track_path)
		stream = s
	elif ext == "ogg":
		stream = AudioStreamOggVorbis.load_from_file(track_path)
	elif ext == "wav":
		stream = AudioStreamWAV.load_from_file(track_path)
	if stream == null:
		push_warning("could not load %s" % track_path)
		return
	player = AudioStreamPlayer.new()
	player.stream = stream
	add_child(player)
	player.play()


func _process(delta: float) -> void:
	t += delta
	if player and player.playing:
		beat = start_bar * 4.0 + (player.get_playback_position() + AudioServer.get_time_since_last_mix()) * bpm / 60.0
		var k := spectrum.get_magnitude_for_frequency_range(40.0, 130.0).length()
		var b := spectrum.get_magnitude_for_frequency_range(130.0, 320.0).length()
		kick = max(clamp(k * 18.0, 0.0, 1.0), kick - delta * 3.0)
		bass = lerp(bass, clamp(b * 14.0, 0.0, 1.0), 0.2)
	else:
		beat = start_bar * 4.0 + t * bpm / 60.0
		var ph := fmod(beat, 1.0)
		kick = pow(1.0 - ph, 4.0) if section != "break" else 0.0
		bass = 0.5 + 0.5 * sin(t)
	var bar := int(beat / 4.0) % 72
	section = "intro" if bar < 16 else ("build" if bar < 24 else ("drop" if bar < 56 else "break"))
	if section != last_section:
		if section == "drop":
			drop_age = 0.0
		last_section = section
	drop_age += delta
	_light(delta)
	_direct(delta)


func _light(_delta: float) -> void:
	var level: float = {"intro": 0.55, "build": 0.7, "drop": 1.0, "break": 0.35}[section]
	ring_mat.albedo_color = ORANGE * (2.0 + level * 4.0 + kick * 5.0)
	spill.light_energy = 1.0 + level * 4.0 + kick * 3.0
	# gate explodes on the drop and reassembles over two bars
	var age := drop_age / (60.0 / bpm * 8.0)
	var e := pow(sin(min(1.0, age) * PI), 0.7) if age < 1.0 else 0.0
	for i in panels.size():
		panels[i].position = panel_dirs[i] * e * 3.5 + Vector3(0.0, 0.0, e * 2.5)
	crowd_mat.set_shader_parameter("beat_phase", fmod(beat, 1.0))
	crowd_mat.set_shader_parameter("jump", 1.0 if section == "drop" else (0.35 if section == "intro" else 0.05))
	crowd_mat.set_shader_parameter("arms", 1.0 if section == "drop" else (0.55 if section == "break" else 0.2))
	crowd_mat.set_shader_parameter("rim_a", ORANGE * level)
	crowd_mat.set_shader_parameter("rim_b", BLUE * level)
	var on := 0.0 if section == "break" else level
	for i in laser_origins.size():
		var o: Vector3 = laser_origins[i]
		var centre := i < 12
		var x := (float(i % 12) / 11.0 - 0.5) if centre else (float(i % 6) / 5.0 - 0.5)
		var az := x * 1.6 * (0.55 + 0.45 * sin(beat / 4.0 * TAU))
		if not centre:
			az = (0.35 if o.x < 0.0 else -0.35) + x * 0.7
		var el := (0.2 if centre else 0.02) + 0.14 * sin(beat / 4.0 * TAU)
		var dir := Vector3(sin(az) * cos(el), sin(el), cos(az) * cos(el)).normalized()
		var length := 120.0
		var basis := Basis(Quaternion(Vector3.UP, dir)) * Basis.from_scale(Vector3(1.0, length, 1.0))
		laser_mm.set_instance_transform(i, Transform3D(basis, o + dir * length * 0.5))
		var gate_on := 1.0 if (section != "drop" or fmod(beat, 1.0) < 0.55) else 0.15
		var c := (BLUE if (int(beat / 8.0) % 2 == 0) else ORANGE) * on * gate_on * 1.6
		laser_mm.set_instance_color(i, Color(c.r, c.g, c.b, 1.0))


func _direct(delta: float) -> void:
	var s := int(beat / 32.0) % 4 if section != "drop" else int(beat / 8.0) % 4
	if s != shot:
		shot = s
	var p := fmod(beat, 32.0) / 32.0
	var pos := Vector3.ZERO
	var look := Vector3(0.0, 7.0, -21.0)
	match shot:
		0:
			pos = Vector3(4.0 * p, 7.5 + p, 46.0)
		1:
			pos = Vector3(2.0, 2.5, -5.0 - p * 6.0)
			look = Vector3(0.0, 4.5, -20.0)
		2:
			var a := 0.9 - p * 1.8
			pos = Vector3(sin(a) * 17.0, 5.5, -21.0 + cos(a) * 17.0)
		3:
			var a2 := p * 0.9
			pos = Vector3(sin(a2) * 34.0, 24.0, 10.0 + cos(a2) * 26.0)
			look = Vector3(0.0, 2.0, -15.0)
	cam.position = cam.position.lerp(pos, clamp(delta * 4.0, 0.0, 1.0)) if t > 0.2 else pos
	cam.position += Vector3(randf() - 0.5, randf() - 0.5, 0.0) * kick * kick * 0.06
	cam.look_at(look, Vector3.UP)
