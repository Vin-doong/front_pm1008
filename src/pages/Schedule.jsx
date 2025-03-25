import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import axios from 'axios';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import Header from '../components/include/Header';
import './Schedule.css';

// Localizer 설정
const localizer = momentLocalizer(moment);

// Drag and Drop 캘린더
const DnDCalendar = withDragAndDrop(Calendar);

// Axios 인스턴스 설정
const instance = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 인증 추가
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const Schedule = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [weeklyPlan, setWeeklyPlan] = useState({});
  const [todayPlan, setTodayPlan] = useState([]);
  const [events, setEvents] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [supplements, setSupplements] = useState([]);
  const [selectedSupplement, setSelectedSupplement] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [memo, setMemo] = useState('');

  // 상태별 색상 클래스
  const getStatusClass = (status) => {
    switch (status) {
      case '완료': return 'bg-green-200';
      case '미완료': return 'bg-red-200';
      case '예정': return 'bg-gray-200';
      default: return '';
    }
  };

  // 계정 유형 확인
  const checkAccountType = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      await instance.get('/api/member/account-type');
    } catch (error) {
      console.error('계정 유형 확인 오류:', error);
    }
  };

  // 주간 계획 조회
  const fetchWeeklyPlan = async () => {
    try {
      const response = await instance.get('/api/weekly-plan');
      setWeeklyPlan(response.data);
    } catch (error) {
      console.error('주간 계획 조회 중 오류:', error);
    }
  };

  // 오늘의 계획 조회
  const fetchTodayPlan = async () => {
    try {
      const response = await instance.get('/api/today-plan');
      setTodayPlan(response.data);
    } catch (error) {
      console.error('오늘의 계획 조회 중 오류:', error);
    }
  };

  // 이벤트 목록 조회
  const fetchEvents = async () => {
    try {
      const response = await instance.get('/api/events');
      const formattedEvents = response.data.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('이벤트 목록 조회 중 오류:', error);
    }
  };

  // 영양제 목록 조회
  const fetchSupplements = async () => {
    try {
      const response = await instance.get('/api/supplements');
      setSupplements(response.data);
    } catch (error) {
      console.error('영양제 목록 조회 중 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 초기 데이터 로딩
  useEffect(() => {
    checkAccountType();
    fetchWeeklyPlan();
    fetchTodayPlan();
    fetchEvents();
    fetchSupplements();
  }, []);

  // 테스트용 데이터 설정
  useEffect(() => {
    if (events.length === 0) {
      const testEvents = [
        {
          id: 1,
          title: '영양제 복용 - 비타민 C',
          start: new Date(2025, 2, 24, 8, 0),
          end: new Date(2025, 2, 24, 8, 30),
          allDay: false,
        },
        {
          id: 2,
          title: '운동 스케줄',
          start: new Date(2025, 2, 24, 18, 0),
          end: new Date(2025, 2, 24, 19, 0),
          allDay: false,
        },
        {
          id: 3,
          title: '회의 참석',
          start: new Date(2025, 2, 25, 10, 0),
          end: new Date(2025, 2, 25, 11, 0),
          allDay: false,
        },
      ];
      setEvents(testEvents);
    }
  }, [events]);

  // 이벤트 드래그 앤 드롭 처리
  const moveEvent = ({ event, start, end }) => {
    const updatedEvents = events.map((existingEvent) =>
      existingEvent.id === event.id 
        ? { ...existingEvent, start, end } 
        : existingEvent
    );
    setEvents(updatedEvents);
    try {
      instance.put(`/api/events/${event.id}`, { ...event, start, end });
    } catch (error) {
      console.error('이벤트 업데이트 중 오류:', error);
    }
  };

  // 이벤트 크기 조절 처리
  const resizeEvent = ({ event, start, end }) => {
    const updatedEvents = events.map((existingEvent) =>
      existingEvent.id === event.id 
        ? { ...existingEvent, start, end } 
        : existingEvent
    );
    setEvents(updatedEvents);
    try {
      instance.put(`/api/events/${event.id}`, { ...event, start, end });
    } catch (error) {
      console.error('이벤트 크기 조절 중 오류:', error);
    }
  };

  // 이벤트 추가
  const handleAddEvent = async () => {
    if (!newEventTitle) return;
    const newEvent = {
      title: newEventTitle,
      start: date,
      end: new Date(date.getTime() + 3600 * 1000),
      allDay: false,
    };
    try {
      const response = await instance.post('/api/events', newEvent);
      setEvents([...events, response.data]);
      setNewEventTitle('');
    } catch (error) {
      alert('이벤트 추가 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  // 이벤트 삭제
  const handleDeleteEvent = async (event) => {
    try {
      await instance.delete(`/api/events/${event.id}`);
      setEvents(events.filter((e) => e.id !== event.id));
    } catch (error) {
      alert('이벤트 삭제 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  // 복용 기록 입력
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplement || !selectedTime) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    try {
      await instance.post('/api/records', {
        supplement: selectedSupplement,
        time: selectedTime,
        memo,
      });
      alert('복용 기록이 저장되었습니다.');
      setSelectedSupplement('');
      setSelectedTime('');
      setMemo('');
    } catch (error) {
      console.error('복용 기록 저장 중 오류:', error);
    }
  };

  // 알림 기능
  useEffect(() => {
    const scheduleNotifications = () => {
      todayPlan.forEach((item) => {
        const now = new Date();
        const eventTime = new Date(now.toDateString() + ' ' + item.time);
        const timeDiff = eventTime - now;
        if (timeDiff > 0 && timeDiff < 86400000) {
          setTimeout(() => {
            Swal.fire({
              title: `${item.supplement} 복용 시간입니다!`,
              text: `지금 ${item.supplement}을(를) 복용하세요.`,
              icon: 'info',
              confirmButtonText: '확인',
            });
          }, timeDiff);
        }
      });
    };
    scheduleNotifications();
  }, [todayPlan]);
  return (
    <div className="bg-gray-50 font-['Noto_Sans_KR']">
      <Header />
      
      <main className="p-6 mt-4 container mx-auto">
        <div className="max-w-7xl mx-auto">
          {/* (이전 오늘의 영양제와 주간 복용 계획 섹션 동일) */}
          
          {/* 복용 일정 캘린더 */}
          <div className="mt-4 p-4 bg-white shadow rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">복용 일정</h2>
            <div style={{ height: 500 }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectSlot={(slotInfo) => setDate(slotInfo.start)}
                onEventDrop={moveEvent}
                onEventResize={resizeEvent}
                selectable={true}
                resizable={true}
                droppable={true}
                components={{
                  event: (props) => (
                    <div
                      {...props}
                      className="bg-teal-500 text-white p-2 rounded cursor-pointer hover:bg-teal-600 flex items-center justify-between"
                    >
                      <span>{props.event.title}</span>
                      <button 
                        onClick={() => handleDeleteEvent(props.event)} 
                        className="text-red-500 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ),
                }}
              />
            </div>
            <div className="mt-4 flex">
              <input
                type="text"
                placeholder="새로운 이벤트 제목"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="border rounded-md p-2 mr-2 flex-grow"
              />
              <button
                onClick={handleAddEvent}
                className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600"
              >
                이벤트 추가
              </button>
            </div>
            <p className="mt-4 text-gray-900">선택한 날짜: {date.toLocaleDateString()}</p>
          </div>
          
          {/* 복용 기록 입력 */}
          <div className="mt-4 p-4 bg-white shadow rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">복용 기록 입력</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col">
                <label htmlFor="supplement" className="mb-2 text-sm font-medium text-gray-700">
                  영양제 선택
                </label>
                <select
                  id="supplement"
                  value={selectedSupplement}
                  onChange={(e) => setSelectedSupplement(e.target.value)}
                  className="border rounded-md p-2 w-full"
                >
                  <option value="">선택하세요</option>
                  {supplements.map((supplement) => (
                    <option key={supplement.id} value={supplement.name}>
                      {supplement.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col">
                <label htmlFor="time" className="mb-2 text-sm font-medium text-gray-700">
                  복용 시간
                </label>
                <input
                  type="time"
                  id="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="border rounded-md p-2 w-full"
                />
              </div>
              
              <div className="flex flex-col">
                <label htmlFor="memo" className="mb-2 text-sm font-medium text-gray-700">
                  메모
                </label>
                <textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="border rounded-md p-2 w-full"
                  rows="3"
                  placeholder="복용에 대한 추가 메모를 입력하세요"
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600"
                >
                  기록 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Schedule;