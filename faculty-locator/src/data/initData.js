export function initData() {
  if (!localStorage.getItem("facultyData")) {
    const faculty = [
      {
        id: "FAC001",
        name: "Dr. Kumar",
        department: "Computer Science",
        timetableLocation: "CS Block - Lab 3",
        liveStatus: null
      },
      {
        id: "FAC002",
        name: "Prof. Anitha",
        department: "Information Technology",
        timetableLocation: "IT Block - Room 210",
        liveStatus: null
      }
    ];

    localStorage.setItem("facultyData", JSON.stringify(faculty));
  }
}
