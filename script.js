document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Your message has been sent!');
    this.reset(); // Reset the form
});

document.getElementById('language-switcher').addEventListener('change', function() {
    const selectedLanguage = this.value;

    if (selectedLanguage === 'fa') {
        document.getElementById('header-title').textContent = 'سلام، من پویام!';
        document.getElementById('header-description').textContent = 'به وب‌سایت شخصی من خوش آمدید.';
        document.getElementById('about-title').textContent = 'درباره من';
        document.getElementById('about-description').textContent = 'من یک برنامه‌نویس هستم که در زمینه‌های Python و JavaScript تخصص دارم.';
        document.getElementById('projects-title').textContent = 'پروژه‌ها';
        document.getElementById('contact-title').textContent = 'تماس با من';
        document.querySelector('input[placeholder="Name"]').placeholder = 'نام';
        document.querySelector('input[placeholder="Email"]').placeholder = 'ایمیل';
        document.querySelector('textarea[placeholder="Message"]').placeholder = 'پیام';
        document.querySelector('button').textContent = 'ارسال';
    } else {
        document.getElementById('header-title').textContent = 'Hello, I\'m Pouya!';
        document.getElementById('header-description').textContent = 'Welcome to my personal website.';
        document.getElementById('about-title').textContent = 'About Me';
        document.getElementById('about-description').textContent = 'I am a programmer specializing in Python and JavaScript. Passionate about web development and creating user-friendly experiences.';
        document.getElementById('projects-title').textContent = 'Projects';
        document.getElementById('contact-title').textContent = 'Contact Me';
        document.querySelector('input[placeholder="Name"]').placeholder = 'Name';
        document.querySelector('input[placeholder="Email"]').placeholder = 'Email';
        document.querySelector('textarea[placeholder="Message"]').placeholder = 'Message';
        document.querySelector('button').textContent = 'Send';
    }
});
