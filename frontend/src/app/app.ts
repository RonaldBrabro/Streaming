import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { VideoService, User } from './services/video.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  currentUser?: User;
  showLogin = false;
  showRegister = false;
  showCreateChannel = false;
  showLogoutConfirm = false;

  loginForm = { email: '', password: '' };
  registerForm = { email: '', password: '', nickname: '', region: '' };
  channelForm = { nombre_canal: '', biografia: '', stream_key: '' };

  constructor(private vs: VideoService, private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Load user from localStorage only on browser
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        this.currentUser = JSON.parse(userStr);
      }
    }
  }

  login() {
    this.vs.login(this.loginForm).subscribe(user => {
      this.currentUser = user;
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      this.showLogin = false;
      this.loginForm = { email: '', password: '' };
      if (user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  register() {
    this.vs.register(this.registerForm).subscribe(res => {
      alert('Registered! Now login.');
      this.showRegister = false;
      this.registerForm = { email: '', password: '', nickname: '', region: '' };
    });
  }

  createChannel() {
    if (!this.currentUser) return;
    this.vs.createChannel({ ...this.channelForm, id_usuario: this.currentUser.id_usuario }).subscribe(res => {
      alert('Channel created!');
      this.showCreateChannel = false;
      this.channelForm = { nombre_canal: '', biografia: '', stream_key: '' };
    });
  }

  logout() {
    this.showLogoutConfirm = true;
  }

  confirmLogout() {
    this.currentUser = undefined;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('user');
    }
    this.showLogoutConfirm = false;
    this.router.navigate(['/']);
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
  }
}
