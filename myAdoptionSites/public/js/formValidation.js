function validateForm() {
  const form = document.getElementById('giveAwayForm');
  let isValid = true;  // Assume the form is valid initially
  const fields = form.querySelectorAll('[required]');  // Select all required fields

  for (let field of fields) {
    if (!field.value.trim()) {
      alert('Please fill out all required fields.');
      field.classList.add('error');  // Highlight the field with an error class
      field.focus();  // Focus the first empty field
      return false;  // Return false to prevent form submission
    }

    if (field.type === "email" && !validateEmail(field.value)) {
      alert('Please enter a valid email address.');
      field.classList.add('error');  // Highlight the field with an error class
      field.focus();  // Focus the incorrect email field
      return false;  // Return false to prevent form submission
    } else {
      field.classList.remove('error');  // Remove error class if field is valid
    }
  }
  return isValid;  // Return true if all fields are valid, allowing form submission
}

// Helper function to check if the email is valid
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  // Regular expression for validating email
  return regex.test(email);  // Returns true if the email matches the regex, false otherwise
}

document.getElementById('giveAwayForm').addEventListener('submit', function(event) {
  if (!validateForm()) {
    event.preventDefault();  // Prevent form submission if validation fails
  }
});
