import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { User, UserRole } from '../../../interfaces/user.interface';
import { SetaTheme } from '../../../interfaces/seta.interface';
import { IconService } from '../../../core/services/icon.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: UserRole[];
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input() collapsed = false;
  @Input() currentUser: User | null = null;
  @Input() theme: SetaTheme | null = null;
  @Output() toggle = new EventEmitter<void>();

  navItems: NavItem[] = [
    {
      label: 'nav.dashboard',
      icon: 'home',
      route: '/dashboard',
      roles: [UserRole.Admin, UserRole.Staff]
    },
    {
      label: 'nav.verification',
      icon: 'check-circle',
      route: '/verification',
      roles: [UserRole.Admin, UserRole.Staff],
      children: [
        { label: 'nav.singleVerify', icon: 'check', route: '/verification/single', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.batchVerify', icon: 'upload', route: '/verification/batch', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.batchQueue', icon: 'layers', route: '/verification/queue', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.recentVerifications', icon: 'clock', route: '/verification/history', roles: [UserRole.Admin, UserRole.Staff] }
      ]
    },
    {
      label: 'nav.learners',
      icon: 'users',
      route: '/learners',
      roles: [UserRole.Admin, UserRole.Staff],
      children: [
        { label: 'nav.learnerList', icon: 'list', route: '/learners/list', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.enrollLearner', icon: 'user-plus', route: '/learners/enroll', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.searchLearner', icon: 'search', route: '/learners/search', roles: [UserRole.Admin, UserRole.Staff] }
      ]
    },
    {
      label: 'nav.reports',
      icon: 'bar-chart-2',
      route: '/reports',
      roles: [UserRole.Admin, UserRole.Staff],
      children: [
        { label: 'nav.verificationReport', icon: 'file-text', route: '/reports/verification', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.enrollmentReport', icon: 'pie-chart', route: '/reports/enrollment', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.auditLog', icon: 'activity', route: '/reports/audit', roles: [UserRole.Admin, UserRole.Staff] }
      ]
    },
    {
      label: 'nav.admin',
      icon: 'settings',
      route: '/admin',
      roles: [UserRole.Admin],
      children: [
        { label: 'nav.userManagement', icon: 'user', route: '/admin/users', roles: [UserRole.Admin] },
        { label: 'nav.setaManagement', icon: 'briefcase', route: '/admin/setas', roles: [UserRole.Admin] },
        { label: 'nav.settings', icon: 'sliders', route: '/admin/settings', roles: [UserRole.Admin] }
      ]
    },
    {
      label: 'nav.myPortal',
      icon: 'user',
      route: '/my-portal',
      roles: [UserRole.Learner],
      children: [
        { label: 'nav.myStatus', icon: 'info', route: '/my-portal/status', roles: [UserRole.Learner] },
        { label: 'nav.myCertificates', icon: 'award', route: '/my-portal/certificates', roles: [UserRole.Learner] },
        { label: 'nav.learnerships', icon: 'book-open', route: '/my-portal/learnerships', roles: [UserRole.Learner] }
      ]
    }
  ];

  expandedItems: Set<string> = new Set();

  canAccess(item: NavItem): boolean {
    if (!this.currentUser) return false;
    return item.roles.includes(this.currentUser.role);
  }

  toggleExpanded(route: string): void {
    if (this.expandedItems.has(route)) {
      this.expandedItems.delete(route);
    } else {
      this.expandedItems.add(route);
    }
  }

  isExpanded(route: string): boolean {
    return this.expandedItems.has(route);
  }

  getIcon(iconName: string): string {
    return this.iconService.getIconPath(iconName);
  }

  getSafeIcon(iconName: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getIcon(iconName));
  }
}
