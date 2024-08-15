document.addEventListener('DOMContentLoaded', function () {
  const dateTimeDisplay = document.getElementById('dateTimeDisplay');

  function updateTime() {
    const now = new Date();
    dateTimeDisplay.textContent = now.toLocaleTimeString();
  }

  if (dateTimeDisplay) {
    setInterval(updateTime, 1000);
    updateTime();  // Initialize the display immediately on load
  }
});
