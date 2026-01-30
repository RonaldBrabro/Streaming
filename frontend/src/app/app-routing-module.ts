import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './home/home';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { AdminPanel } from './admin-panel/admin-panel';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'streams/:id', component: VideoPlayerComponent },
  { path: 'admin', component: AdminPanel }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
