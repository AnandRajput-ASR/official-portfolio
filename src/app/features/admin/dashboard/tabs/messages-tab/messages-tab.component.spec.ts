import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmService } from '@core/services/confirm.service';
import { MessagesStateService } from '@core/services/messages-state.service';
import { MessagesService } from '@core/services/messages.service';
import { ToastService } from '@shared/components/toast/toast.component';
import { of } from 'rxjs';
import { MessagesTabComponent } from './messages-tab.component';

describe('MessagesTabComponent', () => {
  let component: MessagesTabComponent;
  let fixture: ComponentFixture<MessagesTabComponent>;
  let serviceStub: {
    getMessages: jasmine.Spy;
    markRead: jasmine.Spy;
    toggleStar: jasmine.Spy;
    deleteMessage: jasmine.Spy;
    markAllRead: jasmine.Spy;
  };
  let stateStub: {
    state: ReturnType<typeof signal>;
    load: jasmine.Spy;
    patch: jasmine.Spy;
    setArchived: jasmine.Spy;
    setLabels: jasmine.Spy;
    markQuickReplied: jasmine.Spy;
  };

  beforeEach(async () => {
    serviceStub = {
      getMessages: jasmine.createSpy('getMessages').and.returnValue(of({ messages: [], unreadCount: 0 })),
      markRead: jasmine.createSpy('markRead').and.returnValue(of({})),
      toggleStar: jasmine.createSpy('toggleStar').and.returnValue(of({})),
      deleteMessage: jasmine.createSpy('deleteMessage').and.returnValue(of({})),
      markAllRead: jasmine.createSpy('markAllRead').and.returnValue(of({})),
    };
    stateStub = {
      state: signal({ messages: [], unreadCount: 0, loading: false }),
      load: jasmine.createSpy('load'),
      patch: jasmine.createSpy('patch'),
      setArchived: jasmine.createSpy('setArchived'),
      setLabels: jasmine.createSpy('setLabels'),
      markQuickReplied: jasmine.createSpy('markQuickReplied'),
    };

    await TestBed.configureTestingModule({
      imports: [MessagesTabComponent],
      providers: [
        { provide: MessagesService, useValue: serviceStub },
        { provide: MessagesStateService, useValue: stateStub },
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
        { provide: ToastService, useValue: { success: () => {}, error: () => {} } },
      ],
    })
      .overrideComponent(MessagesTabComponent, { set: { template: '<div></div>', styles: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(MessagesTabComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads messages on init', () => {
    component.ngOnInit();
    expect(stateStub.load).toHaveBeenCalled();
  });

  it('filters unread and starred messages', () => {
    stateStub.state.set({
      messages: [
        { id: '1', name: 'A', email: 'a@a.com', message: 'm', read: false, starred: false },
        { id: '2', name: 'B', email: 'b@b.com', message: 'm', read: true, starred: true },
      ] as any,
      unreadCount: 1,
      loading: false,
    });

    component.messageFilter = 'unread';
    expect(component.filteredMessages.length).toBe(1);

    component.messageFilter = 'starred';
    expect(component.filteredMessages.length).toBe(1);
  });

  it('marks unread message as read when opened', () => {
    const msg: any = {
      id: '1',
      name: 'A',
      email: 'a@a.com',
      message: 'm',
      read: false,
      starred: false,
    };
    stateStub.state.set({ messages: [msg], unreadCount: 1, loading: false });

    component.openMessage(msg);
    expect(serviceStub.markRead).toHaveBeenCalledWith('1');
    expect(stateStub.patch).toHaveBeenCalledWith({ unreadCount: 0 });
  });

  it('toggles star through service', () => {
    const msg: any = { id: '1', starred: false };
    component.toggleStar(msg, new MouseEvent('click'));
    expect(serviceStub.toggleStar).toHaveBeenCalledWith('1');
  });

  it('marks all as read', () => {
    stateStub.state.set({
      messages: [{ id: '1', read: false, starred: false, name: 'A', email: 'a@a.com', message: 'x' }] as any,
      unreadCount: 1,
      loading: false,
    });
    component.markAllRead();
    expect(serviceStub.markAllRead).toHaveBeenCalled();
    expect(stateStub.patch).toHaveBeenCalledWith(jasmine.objectContaining({ unreadCount: 0 }));
  });

  it('formats recent dates', () => {
    expect(component.formatDate('')).toBe('');
    expect(component.formatDate(new Date().toISOString())).toBe('just now');
  });

  it('archives message via state service', () => {
    const msg: any = { id: '1', archived: false };
    component.toggleArchived(msg);
    expect(stateStub.setArchived).toHaveBeenCalledWith('1', true);
  });

  it('adds label through state service', () => {
    const msg: any = { id: '1', labels: [] };
    component.labelInput = 'Recruiter';
    component.addLabel(msg);
    expect(stateStub.setLabels).toHaveBeenCalledWith('1', ['Recruiter']);
  });
});
