extends Control

# Parent mode. One scene, five views (Home / ABC / Log / History / Insights)
# plus an entry detail view, all built in code and swapped by _show().

# --- palette --------------------------------------------------------------
const BG          := Color("e8e7e4")
const CARD        := Color("ffffff")
const PANEL       := Color("f4f3f0")
const INK         := Color("1a1a1a")
const MUTED       := Color("6b6b6b")
const LINE        := Color("dcdcdc")
const DARK_BTN    := Color("262626")

const BLUE        := Color("1f5fa8")
const BLUE_SOFT   := Color("dbe8f5")
const ORANGE      := Color("a8541f")
const ORANGE_SOFT := Color("f7ddc9")
const GREEN       := Color("2e7d32")
const GREEN_SOFT  := Color("dfeeda")
const GREY_SOFT   := Color("d9d9d9")

const CARD_W := 560.0
const PAD := 28.0

# --- chip option lists (from the ABC chart) -------------------------------
const BEHAVIOURS := [
	"Interrupting / blurting out", "Difficulty staying in seat", "Task refusal",
	"Meltdown / tantrum", "Physical aggression (hit/kick)", "Shouted / yelled",
	"Threw an object", "Ran off / left area", "Argued / talked back",
	"Fidgeting / restless", "Cried", "Zoned out / inattentive",
]
const ANTECEDENTS := [
	"Given a demand or request", "Difficult task presented", "Told no / told to wait",
	"Transition between activities", "Attention withdrawn", "Sibling conflict",
	"Tired or hungry", "Preferred item taken away",
]
const TIMES := [
	"Morning / waking up", "Before school", "During school", "After school",
	"Before lunch", "After lunch", "Before dinner", "After dinner",
	"Homework time", "Before bed",
]
const CONSEQUENCES := [
	"Given a break", "Redirected to another activity", "Calmed down alone",
	"Removed from activity", "Request repeated", "Behavior ignored",
	"Given a warning", "Lost a privilege", "Given comfort / attention",
	"Time-out", "Parent gave in", "Sent to another room",
]
const DURATIONS := ["Under 1 minute", "1-5 minutes", "5-15 minutes", "Over 15 minutes"]
const INTENSITIES := ["1 - Mild", "2 - Moderate", "3 - Noticeable", "4 - Strong", "5 - Severe"]
const ACTIVITIES := ["Attune session", "Homework", "Dinner", "Screen time", "Other"]

const DAY_LETTERS := ["S", "M", "T", "W", "T", "F", "S"]
const MONTH_NAMES := ["January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December"]

# --- state ----------------------------------------------------------------
var current_view := "home"
var detail_id := -1

# working selections for the Log view
var log_activity := ""
var log_antecedent := ""
var log_behaviour := ""
var log_consequence := ""
var log_severity := 3
var log_note := ""
var log_prefilled := false

var content: VBoxContainer
var scroll: ScrollContainer
var nav_row: HBoxContainer

func _ready() -> void:
	_build_shell()
	move_child($ExitButton, get_child_count() - 1)  # keep it above the built panels
	_show("home")

# --- shell ----------------------------------------------------------------

func _build_shell() -> void:
	var bg := ColorRect.new()
	bg.color = BG
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var card := ColorRect.new()
	card.color = CARD
	card.position = Vector2((810.0 - CARD_W) * 0.5, 0)
	card.size = Vector2(CARD_W, 648)
	add_child(card)

	scroll = ScrollContainer.new()
	scroll.position = Vector2((810.0 - CARD_W) * 0.5, 0)
	scroll.size = Vector2(CARD_W, 648 - 56)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)

	content = VBoxContainer.new()
	content.custom_minimum_size.x = CARD_W
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.size_flags_vertical = Control.SIZE_SHRINK_BEGIN  # grow to fit, then scroll
	content.add_theme_constant_override("separation", 12)
	scroll.add_child(content)

	_build_nav()

func _build_nav() -> void:
	var bar := ColorRect.new()
	bar.color = CARD
	bar.position = Vector2((810.0 - CARD_W) * 0.5, 648 - 56)
	bar.size = Vector2(CARD_W, 56)
	add_child(bar)

	var line := ColorRect.new()
	line.color = LINE
	line.position = Vector2((810.0 - CARD_W) * 0.5, 648 - 56)
	line.size = Vector2(CARD_W, 1)
	add_child(line)

	nav_row = HBoxContainer.new()
	nav_row.position = Vector2((810.0 - CARD_W) * 0.5 + PAD, 648 - 48)
	nav_row.size = Vector2(CARD_W - PAD * 2, 40)
	nav_row.add_theme_constant_override("separation", 6)
	add_child(nav_row)

	for item in [["Home", "home"], ["ABC", "abc"], ["Log", "log"],
			["History", "history"], ["Insights", "insights"]]:
		var b := Button.new()
		b.text = item[0]
		b.flat = true
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.add_theme_font_size_override("font_size", 14)
		b.pressed.connect(_show.bind(item[1]))
		nav_row.add_child(b)

func _refresh_nav() -> void:
	var keys := ["home", "abc", "log", "history", "insights"]
	for i in nav_row.get_child_count():
		var b := nav_row.get_child(i) as Button
		var active: bool = keys[i] == current_view
		b.add_theme_color_override("font_color", INK if active else MUTED)
		b.add_theme_color_override("font_hover_color", INK)

func _show(view: String, keep_scroll := false) -> void:
	var previous := scroll.scroll_vertical
	current_view = view
	for c in content.get_children():
		c.queue_free()
	scroll.scroll_vertical = 0
	_refresh_nav()

	match view:
		"home": _build_home()
		"abc": _build_abc()
		"log": _build_log()
		"history": _build_history()
		"insights": _build_insights()
		"detail": _build_detail()

	if keep_scroll:
		await get_tree().process_frame
		scroll.scroll_vertical = previous

# Rebuilds the current view in place, holding the scroll position.
func _rebuild() -> void:
	_show(current_view, true)

# --- small builders -------------------------------------------------------

func _rounded(colour: Color, radius: int = 10) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = colour
	sb.corner_radius_top_left = radius
	sb.corner_radius_top_right = radius
	sb.corner_radius_bottom_left = radius
	sb.corner_radius_bottom_right = radius
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 9
	sb.content_margin_bottom = 9
	return sb

func _outlined(radius: int = 14) -> StyleBoxFlat:
	var sb := _rounded(CARD, radius)
	sb.border_color = LINE
	sb.set_border_width_all(1)
	return sb

func _spacer(h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size.y = h
	return c

func _pad_row(node: Control) -> MarginContainer:
	var m := MarginContainer.new()
	m.add_theme_constant_override("margin_left", int(PAD))
	m.add_theme_constant_override("margin_right", int(PAD))
	m.add_child(node)
	return m

func _label(text: String, size: int, colour: Color, bold_gap := 0) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", colour)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if bold_gap > 0:
		l.add_theme_constant_override("line_spacing", bold_gap)
	return l

func _add(node: Control) -> void:
	content.add_child(_pad_row(node))

func _add_heading(text: String, size := 15, colour := INK) -> void:
	_add(_label(text, size, colour))

func _section(title: String, subtitle: String, colour: Color) -> void:
	content.add_child(_spacer(14))
	_add(_label(title, 16, colour))
	if subtitle != "":
		_add(_label(subtitle, 11, MUTED))

# A tappable chip. Returns the button so callers can wire selection.
func _chip(text: String, selected: bool, accent: Color) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", 13)
	b.add_theme_color_override("font_color", INK)
	b.add_theme_color_override("font_hover_color", INK)
	b.add_theme_color_override("font_pressed_color", INK)
	var sb := _rounded(accent, 14) if selected else _outlined(14)
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("hover", sb)
	b.add_theme_stylebox_override("pressed", sb)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	return b

# A wrapping row of chips. "store" is the array or single-value setter target.
func _chip_flow(options: Array, is_selected: Callable, on_press: Callable, accent: Color) -> HFlowContainer:
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", 8)
	flow.add_theme_constant_override("v_separation", 8)
	for opt in options:
		var text := str(opt)
		var chip := _chip(text, bool(is_selected.call(text)), accent)
		chip.pressed.connect(func() -> void:
			on_press.call(text)
			_rebuild())
		flow.add_child(chip)
	return flow

func _dark_button(text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size.y = 50
	b.add_theme_font_size_override("font_size", 16)
	b.add_theme_color_override("font_color", Color.WHITE)
	b.add_theme_color_override("font_hover_color", Color.WHITE)
	b.add_theme_color_override("font_pressed_color", Color.WHITE)
	var sb := _rounded(DARK_BTN, 10)
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("hover", sb)
	b.add_theme_stylebox_override("pressed", sb)
	return b

func _outline_button(text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size.y = 50
	b.add_theme_font_size_override("font_size", 15)
	b.add_theme_color_override("font_color", INK)
	b.add_theme_color_override("font_hover_color", INK)
	var sb := _outlined(10)
	b.add_theme_stylebox_override("normal", sb)
	b.add_theme_stylebox_override("hover", sb)
	b.add_theme_stylebox_override("pressed", sb)
	return b

func _text_field(placeholder: String, value: String, on_change: Callable) -> LineEdit:
	var e := LineEdit.new()
	e.placeholder_text = placeholder
	e.text = value
	e.custom_minimum_size.y = 40
	e.add_theme_font_size_override("font_size", 13)
	e.add_theme_stylebox_override("normal", _outlined(8))
	e.add_theme_stylebox_override("focus", _outlined(8))
	e.text_changed.connect(func(t: String) -> void: on_change.call(t))
	return e

func _stat_card(caption: String, value: String) -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _rounded(PANEL, 10))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 2)
	box.add_child(_label(caption, 11, MUTED))
	box.add_child(_label(value, 22, INK))
	panel.add_child(box)
	return panel

func _banner(text: String, bg: Color, fg: Color) -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _rounded(bg, 8))
	panel.add_child(_label(text, 12, fg))
	return panel

func _divider() -> Control:
	var r := ColorRect.new()
	r.color = LINE
	r.custom_minimum_size.y = 1
	return r

# --- Home -----------------------------------------------------------------

func _build_home() -> void:
	var now := Time.get_datetime_dict_from_system()
	var date_text := "%s, %s %d" % [
		_weekday_name(now), MONTH_NAMES[int(now["month"]) - 1].substr(0, 3), int(now["day"])]

	content.add_child(_spacer(30))
	_add(_label(date_text, 13, MUTED))
	_add(_label(_greeting(int(now["hour"])), 26, INK))

	var who := "Set up your ABC chart to get started"
	if ParentData.child_name != "":
		who = "Tracking for %s" % ParentData.child_name
		if ParentData.child_age != "":
			who += ", age %s" % ParentData.child_age
	_add(_label(who, 13, MUTED))

	content.add_child(_spacer(12))
	var log_btn := _dark_button("+  Log a moment")
	log_btn.pressed.connect(func() -> void: _open_log())
	_add(log_btn)

	content.add_child(_spacer(6))
	var stats := HBoxContainer.new()
	stats.add_theme_constant_override("separation", 10)
	stats.add_child(_stat_card("This week", "%d entries" % ParentData.entries_this_week()))
	var avg := ParentData.average_intensity()
	stats.add_child(_stat_card("Avg intensity", ("%.1f / 5" % avg) if avg > 0.0 else "-"))
	_add(stats)

	content.add_child(_spacer(6))
	_add(_banner(_insight_line(), BLUE_SOFT, BLUE))

	content.add_child(_spacer(10))
	_add(_label("Recent", 16, INK))

	if ParentData.entries.is_empty():
		content.add_child(_spacer(4))
		_add(_label("No entries yet. Tap \"Log a moment\" to add your first one.", 13, MUTED))
	else:
		for e in ParentData.entries.slice(0, 5):
			_add(_entry_row(e))
			_add(_divider())

	content.add_child(_spacer(20))

func _entry_row(e: Dictionary) -> Control:
	var b := Button.new()
	b.custom_minimum_size.y = 60
	b.flat = true
	b.pressed.connect(func() -> void:
		detail_id = int(e["id"])
		_show("detail"))

	var row := HBoxContainer.new()
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 8)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 1)
	col.add_child(_label(str(e["behaviour"]), 15, INK))
	col.add_child(_label("%s · %s" % [_when_text(int(e["time"])), str(e["activity"])], 12, MUTED))
	row.add_child(col)
	row.add_child(_label(">", 14, MUTED))

	b.add_child(row)
	return b

func _greeting(hour: int) -> String:
	if hour < 12:
		return "Good morning"
	elif hour < 18:
		return "Good afternoon"
	return "Good evening"

func _insight_line() -> String:
	if ParentData.entries.size() < 3:
		return "Log a few moments and patterns will show up here."
	var bands := ParentData.time_of_day_counts()
	var labels := ["7-9am", "9am-12pm", "12-3pm", "3-6pm", "6-9pm"]
	var best := 0
	for i in bands.size():
		if bands[i] > bands[best]:
			best = i
	return "Behaviors cluster around %s this week" % labels[best]

# --- ABC setup ------------------------------------------------------------

func _build_abc() -> void:
	content.add_child(_spacer(30))
	_add(_label("ABC Chart Setup", 24, INK))
	_add(_label("Let's capture the basics before your first log", 13, MUTED))

	content.add_child(_spacer(10))
	var about := PanelContainer.new()
	about.add_theme_stylebox_override("panel", _rounded(PANEL, 10))
	var abox := VBoxContainer.new()
	abox.add_theme_constant_override("separation", 6)
	abox.add_child(_label("About your child", 14, INK))

	var names := HBoxContainer.new()
	names.add_theme_constant_override("separation", 10)
	var name_col := VBoxContainer.new()
	name_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_col.add_child(_label("Name", 11, MUTED))
	name_col.add_child(_text_field("e.g. Leo", ParentData.child_name,
		func(t: String) -> void:
			ParentData.child_name = t
			ParentData.save_data()))
	var age_col := VBoxContainer.new()
	age_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	age_col.add_child(_label("Age", 11, MUTED))
	age_col.add_child(_text_field("e.g. 7 years", ParentData.child_age,
		func(t: String) -> void:
			ParentData.child_age = t
			ParentData.save_data()))
	names.add_child(name_col)
	names.add_child(age_col)
	abox.add_child(names)

	abox.add_child(_label("Diagnosis / notes (optional)", 11, MUTED))
	abox.add_child(_text_field("e.g. ADHD-combined type, diagnosed 2024", ParentData.diagnosis,
		func(t: String) -> void:
			ParentData.diagnosis = t
			ParentData.save_data()))
	about.add_child(abox)
	_add(about)

	_section("What behaviors do you want to track?",
		"Select all that apply - based on common ADHD behaviors", BLUE)
	_add(_chip_flow(BEHAVIOURS,
		func(t: String) -> bool: return ParentData.tracked_behaviours.has(t),
		func(t: String) -> void: _toggle(ParentData.tracked_behaviours, t),
		BLUE_SOFT))

	_section("What usually happens right before?", "Common antecedents / triggers", ORANGE)
	_add(_chip_flow(ANTECEDENTS,
		func(t: String) -> bool: return ParentData.tracked_antecedents.has(t),
		func(t: String) -> void: _toggle(ParentData.tracked_antecedents, t),
		ORANGE_SOFT))

	_section("When does this usually happen?", "Typical times ADHD behaviors spike", INK)
	_add(_chip_flow(TIMES,
		func(t: String) -> bool: return ParentData.tracked_times.has(t),
		func(t: String) -> void: _toggle(ParentData.tracked_times, t),
		GREY_SOFT))

	_section("How long, and how intense?", "Pick the typical range", INK)
	_add(_chip_flow(DURATIONS,
		func(t: String) -> bool: return ParentData.typical_duration == t,
		func(t: String) -> void:
			ParentData.typical_duration = t
			ParentData.save_data(),
		GREY_SOFT))
	content.add_child(_spacer(4))
	_add(_chip_flow(INTENSITIES,
		func(t: String) -> bool: return INTENSITIES[ParentData.typical_intensity - 1] == t,
		func(t: String) -> void:
			ParentData.typical_intensity = INTENSITIES.find(t) + 1
			ParentData.save_data(),
		GREY_SOFT))

	_section("What typically happens after?", "Common parent/caregiver responses", GREEN)
	_add(_chip_flow(CONSEQUENCES,
		func(t: String) -> bool: return ParentData.tracked_consequences.has(t),
		func(t: String) -> void: _toggle(ParentData.tracked_consequences, t),
		GREEN_SOFT))

	content.add_child(_spacer(14))
	var go := _dark_button("Continue to Log  →")
	go.pressed.connect(func() -> void:
		ParentData.setup_done = true
		ParentData.save_data()
		_open_log())
	_add(go)
	content.add_child(_spacer(30))

func _toggle(list: Array, value: String) -> void:
	if list.has(value):
		list.erase(value)
	else:
		list.append(value)
	ParentData.save_data()

# --- Log ------------------------------------------------------------------

# Opens the log view, prefilling from the ABC setup the first time.
func _open_log() -> void:
	if not log_prefilled:
		log_prefilled = true
		log_severity = ParentData.typical_intensity
		if not ParentData.tracked_antecedents.is_empty():
			log_antecedent = str(ParentData.tracked_antecedents[0])
		if not ParentData.tracked_behaviours.is_empty():
			log_behaviour = str(ParentData.tracked_behaviours[0])
		if not ParentData.tracked_consequences.is_empty():
			log_consequence = str(ParentData.tracked_consequences[0])
	_show("log")

func _build_log() -> void:
	var now := Time.get_datetime_dict_from_system()

	content.add_child(_spacer(30))
	var head := HBoxContainer.new()
	var title := _label("Log behaviour", 24, INK)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(title)
	head.add_child(_label("Today, %s" % _clock(int(now["hour"]), int(now["minute"])), 12, MUTED))
	_add(head)

	if ParentData.setup_done:
		content.add_child(_spacer(6))
		_add(_banner("✓  Prefilled from your ABC chart setup - review and save", GREEN_SOFT, GREEN))

	_section("Activity", "", INK)
	_add(_chip_flow(ACTIVITIES,
		func(t: String) -> bool: return log_activity == t,
		func(t: String) -> void: log_activity = "" if log_activity == t else t,
		GREY_SOFT))

	_section("Antecedent - what happened right before", "", ORANGE)
	_add(_chip_flow(_options_for(ParentData.tracked_antecedents, ANTECEDENTS),
		func(t: String) -> bool: return log_antecedent == t,
		func(t: String) -> void: log_antecedent = "" if log_antecedent == t else t,
		ORANGE_SOFT))

	_section("Behaviour - what it looked like", "", BLUE)
	_add(_chip_flow(_options_for(ParentData.tracked_behaviours, BEHAVIOURS),
		func(t: String) -> bool: return log_behaviour == t,
		func(t: String) -> void: log_behaviour = "" if log_behaviour == t else t,
		BLUE_SOFT))

	content.add_child(_spacer(8))
	_add(_label("Severity", 11, MUTED))
	var slider := HSlider.new()
	slider.min_value = 1
	slider.max_value = 5
	slider.step = 1
	slider.value = log_severity
	slider.custom_minimum_size.y = 24
	slider.value_changed.connect(func(v: float) -> void: log_severity = int(v))
	_add(slider)

	_section("Consequence - what happened after", "", GREEN)
	_add(_chip_flow(_options_for(ParentData.tracked_consequences, CONSEQUENCES),
		func(t: String) -> bool: return log_consequence == t,
		func(t: String) -> void: log_consequence = "" if log_consequence == t else t,
		GREEN_SOFT))

	content.add_child(_spacer(10))
	var note := TextEdit.new()
	note.text = log_note
	note.placeholder_text = "Add a note (optional)"
	note.custom_minimum_size.y = 90
	note.add_theme_font_size_override("font_size", 13)
	note.add_theme_stylebox_override("normal", _outlined(8))
	note.add_theme_stylebox_override("focus", _outlined(8))
	note.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	note.text_changed.connect(func() -> void: log_note = note.text)
	_add(note)

	content.add_child(_spacer(10))
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 10)
	var save := _dark_button("✓  Save entry")
	save.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	save.pressed.connect(func() -> void:
		_save_entry()
		_show("home"))
	var save_more := _outline_button("Save and add another")
	save_more.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	save_more.pressed.connect(func() -> void:
		_save_entry()
		_reset_log()
		_show("log"))
	actions.add_child(save)
	actions.add_child(save_more)
	_add(actions)
	content.add_child(_spacer(30))

# Prefer the parent's tracked list; fall back to the full list if they skipped setup.
func _options_for(tracked: Array, fallback: Array) -> Array:
	return tracked if not tracked.is_empty() else fallback

func _save_entry() -> void:
	if log_behaviour == "":
		log_behaviour = "Behaviour"
	ParentData.add_entry({
		"time": int(Time.get_unix_time_from_system()),
		"activity": log_activity if log_activity != "" else "Other",
		"antecedent": log_antecedent,
		"behaviour": log_behaviour,
		"severity": log_severity,
		"consequence": log_consequence,
		"note": log_note,
	})

func _reset_log() -> void:
	log_activity = ""
	log_antecedent = ""
	log_behaviour = ""
	log_consequence = ""
	log_note = ""
	log_severity = ParentData.typical_intensity

# --- entry detail ---------------------------------------------------------

func _build_detail() -> void:
	var e := ParentData.get_entry(detail_id)
	content.add_child(_spacer(30))

	var back := _outline_button("←  Back")
	back.custom_minimum_size = Vector2(90, 34)
	back.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	back.pressed.connect(func() -> void: _show("home"))
	_add(back)

	if e.is_empty():
		content.add_child(_spacer(10))
		_add(_label("That entry is no longer available.", 13, MUTED))
		return

	content.add_child(_spacer(10))
	_add(_label(str(e["behaviour"]), 24, INK))
	_add(_label("%s · %s" % [_full_date(int(e["time"])), str(e["activity"])], 12, MUTED))

	content.add_child(_spacer(12))
	for pair in [
		["Antecedent - what happened right before", str(e["antecedent"]), ORANGE],
		["Behaviour - what it looked like", str(e["behaviour"]), BLUE],
		["Severity", "%d / 5" % int(e["severity"]), INK],
		["Consequence - what happened after", str(e["consequence"]), GREEN],
	]:
		var panel := PanelContainer.new()
		panel.add_theme_stylebox_override("panel", _rounded(PANEL, 8))
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 2)
		box.add_child(_label(str(pair[0]), 11, pair[2]))
		box.add_child(_label(str(pair[1]) if str(pair[1]) != "" else "-", 14, INK))
		panel.add_child(box)
		_add(panel)
		content.add_child(_spacer(6))

	if str(e["note"]) != "":
		_add(_label("Note", 11, MUTED))
		_add(_label(str(e["note"]), 13, INK))

	content.add_child(_spacer(14))
	var del := _outline_button("Delete entry")
	del.pressed.connect(func() -> void:
		ParentData.delete_entry(detail_id)
		_show("home"))
	_add(del)
	content.add_child(_spacer(30))

# --- History --------------------------------------------------------------

func _build_history() -> void:
	content.add_child(_spacer(30))
	var head := HBoxContainer.new()
	var title := _label("History", 24, INK)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(title)
	head.add_child(_label("%d entries" % ParentData.entries.size(), 12, MUTED))
	_add(head)

	content.add_child(_spacer(8))
	var filters := HFlowContainer.new()
	filters.add_theme_constant_override("h_separation", 6)
	for f in ["All", "This week", "Behaviour", "Location"]:
		filters.add_child(_chip(f, f == "All", GREY_SOFT))
	_add(filters)

	content.add_child(_spacer(10))
	_add(_calendar())

	content.add_child(_spacer(12))
	if ParentData.entries.is_empty():
		_add(_label("No entries yet.", 12, MUTED))
	else:
		for e in ParentData.entries:
			_add(_entry_row(e))
			_add(_divider())
	content.add_child(_spacer(30))

func _calendar() -> Control:
	var now := Time.get_datetime_dict_from_system()
	var year := int(now["year"])
	var month := int(now["month"])

	# Tally entries per day of this month.
	var per_day: Dictionary = {}
	for e in ParentData.entries:
		var d := Time.get_datetime_dict_from_unix_time(int(e["time"]))
		if int(d["year"]) == year and int(d["month"]) == month:
			var key := int(d["day"])
			per_day[key] = int(per_day.get(key, 0)) + 1

	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _rounded(PANEL, 10))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	box.add_child(_label("%s %d" % [MONTH_NAMES[month - 1], year], 14, INK))

	var head := GridContainer.new()
	head.columns = 7
	for letter in DAY_LETTERS:
		var l := _label(letter, 10, MUTED)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		head.add_child(l)
	box.add_child(head)

	var grid := GridContainer.new()
	grid.columns = 7
	grid.add_theme_constant_override("h_separation", 2)
	grid.add_theme_constant_override("v_separation", 2)

	var first_weekday := _weekday_index(year, month, 1)
	for i in first_weekday:
		grid.add_child(_spacer(32))

	var days := _days_in_month(year, month)
	for day in range(1, days + 1):
		var count := int(per_day.get(day, 0))
		var cell := PanelContainer.new()
		cell.custom_minimum_size.y = 32
		cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var tint := Color(0, 0, 0, 0)
		if count == 1:
			tint = Color("fdf3d0")
		elif count == 2:
			tint = Color("fbdcc4")
		elif count >= 3:
			tint = Color("f7c3c3")
		cell.add_theme_stylebox_override("panel", _rounded(tint, 6))
		var l := _label(str(day), 10, INK if count > 0 else MUTED)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cell.add_child(l)
		grid.add_child(cell)
	box.add_child(grid)

	var legend := _label("Tap a day to see that day's behavior detail", 10, MUTED)
	box.add_child(legend)
	panel.add_child(box)
	return panel

# --- Insights -------------------------------------------------------------

func _build_insights() -> void:
	content.add_child(_spacer(30))
	_add(_label("Insights", 24, INK))

	content.add_child(_spacer(10))
	_add(_bar_card("Weekly incidents - last 6 weeks",
		ParentData.weekly_counts(6), ["W1", "W2", "W3", "W4", "W5", "W6"]))

	content.add_child(_spacer(10))
	_add(_bar_card("Time-of-day pattern - this week",
		ParentData.time_of_day_counts(), ["7-9am", "9-12", "12-3", "3-6pm", "6-9pm"]))

	content.add_child(_spacer(10))
	_add(_triggers_card())
	content.add_child(_spacer(30))

func _bar_card(title: String, values: Array, labels: Array) -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _rounded(CARD, 12))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	box.add_child(_label(title, 14, INK))

	var peak := 1
	for v in values:
		peak = maxi(peak, int(v))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	row.custom_minimum_size.y = 120
	for i in values.size():
		var col := VBoxContainer.new()
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.alignment = BoxContainer.ALIGNMENT_END
		var bar := ColorRect.new()
		bar.color = Color("c5d8ea")
		bar.custom_minimum_size.y = maxf(8.0, 95.0 * float(values[i]) / float(peak))
		col.add_child(bar)
		var l := _label(str(labels[i]), 9, MUTED)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		col.add_child(l)
		row.add_child(col)
	box.add_child(row)
	panel.add_child(box)
	return panel

func _triggers_card() -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _rounded(CARD, 12))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	box.add_child(_label("Top triggers", 14, INK))

	var rows := ParentData.top_triggers(5)
	if rows.is_empty():
		box.add_child(_label("Log a few moments to see which triggers come up most.", 11, MUTED))
	else:
		var peak := 1
		for r in rows:
			peak = maxi(peak, int(r[1]))
		for r in rows:
			box.add_child(_label(str(r[0]), 11, MUTED))
			var track := PanelContainer.new()
			track.add_theme_stylebox_override("panel", _rounded(Color("eeeeea"), 4))
			track.custom_minimum_size.y = 10
			var fill := ColorRect.new()
			fill.color = Color("c5d8ea")
			fill.custom_minimum_size.y = 10
			fill.size_flags_horizontal = Control.SIZE_FILL
			fill.custom_minimum_size.x = (CARD_W - PAD * 2 - 40) * float(r[1]) / float(peak)
			track.add_child(fill)
			box.add_child(track)
	panel.add_child(box)
	return panel

# --- date helpers ---------------------------------------------------------

func _weekday_name(d: Dictionary) -> String:
	var names := ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
	return names[int(d["weekday"])]

func _days_in_month(year: int, month: int) -> int:
	var lengths := [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	if month == 2 and ((year % 4 == 0 and year % 100 != 0) or year % 400 == 0):
		return 29
	return lengths[month - 1]

func _weekday_index(year: int, month: int, day: int) -> int:
	var unix := Time.get_unix_time_from_datetime_dict({
		"year": year, "month": month, "day": day,
		"hour": 12, "minute": 0, "second": 0})
	return int(Time.get_datetime_dict_from_unix_time(int(unix))["weekday"])

func _clock(hour: int, minute: int) -> String:
	var suffix := "am" if hour < 12 else "pm"
	var h := hour % 12
	if h == 0:
		h = 12
	return "%d:%02d%s" % [h, minute, suffix]

func _when_text(unix: int) -> String:
	var d := Time.get_datetime_dict_from_unix_time(unix)
	var now := Time.get_datetime_dict_from_system()
	var clock := _clock(int(d["hour"]), int(d["minute"]))
	if int(d["year"]) == int(now["year"]) and int(d["month"]) == int(now["month"]):
		var diff := int(now["day"]) - int(d["day"])
		if diff == 0:
			return "Today, %s" % clock
		elif diff == 1:
			return "Yesterday, %s" % clock
	return "%s %d, %s" % [MONTH_NAMES[int(d["month"]) - 1].substr(0, 3), int(d["day"]), clock]

func _full_date(unix: int) -> String:
	var d := Time.get_datetime_dict_from_unix_time(unix)
	return "%s %d, %s" % [
		MONTH_NAMES[int(d["month"]) - 1], int(d["day"]),
		_clock(int(d["hour"]), int(d["minute"]))]

# --- exit -----------------------------------------------------------------

func _on_exit_button_down() -> void:
	get_tree().change_scene_to_file("res://Scenes/SelectScreen.tscn")
