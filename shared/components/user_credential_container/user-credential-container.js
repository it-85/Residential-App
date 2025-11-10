/**
 * 
 * @function UserCredentialContainer 
 * @param {Object} credential
 * @param {string} credential.prompt
 * @param {string} credential.value
 * @param {HTMLButtonElement} credential.edit_button
 * @param {Function} credential.button_pressed_func
 * @param {Object} credential.style
 * @returns HTMLDivElement | null
 * 
 * # UserCredentialContainer Component
 * This functions will create a User Credential Container.
 */
export default function UserCredentialContainer(credential) {
  if(Object.keys(credential).length === 0) {
    console.log("Input object has no item.");
    return null;
  }

  const required_keys = ["prompt", "value", "edit_button", "button_pressed_func", "style"];
  const keys = Object.keys(credential);
  for(const key of required_keys) {
    if(!(key in credential)) {
      console.log(`Missing key '${key}'.`);
      return null;
    }
  }

  let view = document.createElement("div");

  return view;
}