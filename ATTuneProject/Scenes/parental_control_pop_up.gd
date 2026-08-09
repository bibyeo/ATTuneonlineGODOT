extends Control
var text
var password = "password"
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass


func _on_line_edit_text_changed(new_text: String) -> void:
	text = new_text;


func _on_exit_button_down() -> void:
	queue_free();


func _on_enter_parent_mode_button_down() -> void:
	if(text == password):
		print("Password Accepted")
		pass #Stuff I guess
	else:
		print("Password Incorrect")
