import { Component, OnInit } from '@angular/core';
import { VideoService, HomeData, Category, Stream, User } from './services/video.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  homeData?: HomeData;
  selectedStream?: Stream;
  currentUser?: User;
  showLogin = false;
  showRegister = false;
  showCreateChannel = false;

  loginForm = { email: '', password: '' };
  registerForm = { email: '', password: '', nickname: '', region: '' };
  channelForm = { nombre_canal: '', biografia: '', stream_key: '' };

  constructor(private vs: VideoService) {}

  ngOnInit() {
    this.loadHome();
  }

  loadHome() {
    this.vs.getHome().subscribe(data => this.homeData = data);
  }

  selectCategory(cat: Category) {
    this.vs.getStreams(cat.id).subscribe(streams => {
      if (this.homeData) this.homeData.featuredStreams = streams;
    });
  }

  selectStream(stream: Stream) {
    this.selectedStream = stream;
  }

  login() {
    this.vs.login(this.loginForm).subscribe(user => {
      this.currentUser = user;
      this.showLogin = false;
      this.loginForm = { email: '', password: '' };
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
    this.currentUser = undefined;
  }
}
