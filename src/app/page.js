'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { 
  BookOpen, 
  UserCheck, 
  ShieldCheck, 
  Upload, 
  Download, 
  PlusCircle, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Save,
  Calendar,
  FileSpreadsheet,
  Users,
  Briefcase,
  GraduationCap,
  LogOut,
  Lock,
  User
} from 'lucide-react';

export default function Home() {
  // Autenticación y Sesión
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [usuarioAuth, setUsuarioAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Navegación
  const [view, setView] = useState('docente');
  const [adminTab, setAdminTab] = useState('estudiantes');

  // Datos generales
  const [cursos, setCursos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [cargas, setCargas] = useState([]);
  const [docenteCarga, setDocenteCarga] = useState([]);

  // Estados Vista Docente
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedAsignatura, setSelectedAsignatura] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencias, setAsistencias] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Estados Historial / Reportes
  const [reporteCurso, setReporteCurso] = useState('');
  const [reporteAsignatura, setReporteAsignatura] = useState('');
  const [reporteFechaInicio, setReporteFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [reporteFechaFin, setReporteFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [datosReporte, setDatosReporte] = useState([]);
  const [loadingReporte, setLoadingReporte] = useState(false);

  // Formulario Administrador
  const [nuevoCurso, setNuevoCurso] = useState('');
  const [nuevoEstudiante, setNuevoEstudiante] = useState({ documento: '', nombres: '', apellidos: '', curso_id: '' });
  const [nuevoDocente, setNuevoDocente] = useState({ documento: '', nombres: '', apellidos: '', usuario: '', password: '' });
  const [nuevaAsignatura, setNuevaAsignatura] = useState('');
  const [nuevaCarga, setNuevaCarga] = useState({ docente_id: '', curso_id: '', asignatura_id: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarPerfilYDatos(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarPerfilYDatos(session.user);
      else {
        setPerfil(null);
        setDocenteCarga([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const cargarPerfilYDatos = async (user) => {
    const { data: perfData } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
    if (perfData) {
      setPerfil(perfData);
      if (perfData.rol === 'docente') setView('docente');
    }

    cargarDatosBasicos(user, perfData);
  };

  const cargarDatosBasicos = async (user, userPerfil) => {
    const { data: cData } = await supabase.from('cursos').select('*').order('nombre');
    if (cData) {
      setCursos(cData);
      if (cData.length > 0 && !selectedCurso) setSelectedCurso(cData[0].id);
      if (cData.length > 0 && !reporteCurso) setReporteCurso(cData[0].id);
    }

    const { data: dData } = await supabase.from('docentes').select('*').order('apellidos');
    if (dData) setDocentes(dData);

    const { data: aData } = await supabase.from('asignaturas').select('*').order('nombre');
    if (aData) {
      setAsignaturas(aData);
      if (aData.length > 0 && !selectedAsignatura) setSelectedAsignatura(aData[0].id);
    }

    const { data: cgData } = await supabase
      .from('carga_academica')
      .select('*, docentes(nombres, apellidos), cursos(nombre, id), asignaturas(nombre, id)');
    
    if (cgData) {
      setCargas(cgData);
      if (userPerfil?.rol === 'docente' && userPerfil?.docente_id) {
        const miCarga = cgData.filter(c => c.docente_id === userPerfil.docente_id);
        setDocenteCarga(miCarga);
        if (miCarga.length > 0) {
          setSelectedCurso(miCarga[0].curso_id);
          setSelectedAsignatura(miCarga[0].asignatura_id);
        }
      }
    }
  };

  useEffect(() => {
    if (session && selectedCurso && view === 'docente') {
      cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    }
  }, [selectedCurso, selectedAsignatura, fecha, view, session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    setMessage({ text: '', type: '' });

    const userInput = usuarioAuth.trim().toLowerCase();
    const emailTecnico = userInput.includes('@') ? userInput : `${userInput}@colegio.internal`;

    const { error } = await supabase.auth.signInWithPassword({
      email: emailTecnico,
      password: passwordAuth
    });

    setLoadingAuth(false);
    if (error) {
      setMessage({ text: 'Usuario o contraseña incorrectos.', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const cargarEstudiantesYAsistencia = async (cursoId, asignaturaId, fechaActual) => {
    setLoading(true);
    const { data: estData } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('curso_id', cursoId)
      .order('apellidos');

    setEstudiantes(estData || []);

    let query = supabase
      .from('asistencia')
      .select('*')
      .eq('curso_id', cursoId)
      .eq('fecha', fechaActual);

    if (asignaturaId) query = query.eq('asignatura_id', asignaturaId);

    const { data: asisData } = await query;

    const mapaAsistencias = {};
    if (asisData) {
      asisData.forEach(item => {
        mapaAsistencias[item.estudiante_id] = { estado: item.estado, observacion: item.observacion || '' };
      });
    }

    const estadoInicial = {};
    (estData || []).forEach(est => {
      estadoInicial[est.id] = mapaAsistencias[est.id] || { estado: 'Presente', observacion: '' };
    });

    setAsistencias(estadoInicial);
    setLoading(false);
  };

  const handleEstadoChange = (estudianteId, estado) => {
    setAsistencias(prev => ({
      ...prev,
      [estudianteId]: { ...prev[estudianteId], estado }
    }));
  };

  const handleObservacionChange = (estudianteId, observacion) => {
    setAsistencias(prev => ({
      ...prev,
      [estudianteId]: { ...prev[estudianteId], observacion }
    }));
  };

  const guardarAsistencia = async () => {
    if (!selectedCurso || estudiantes.length === 0) return;
    setSaving(true);
    setMessage({ text: '', type: '' });

    const registros = estudiantes.map(est => ({
      estudiante_id: est.id,
      curso_id: selectedCurso,
      asignatura_id: selectedAsignatura || null,
      fecha: fecha,
      estado: asistencias[est.id]?.estado || 'Presente',
      observacion: asistencias[est.id]?.observacion || ''
    }));

    const { error } = await supabase
      .from('asistencia')
      .upsert(registros, { onConflict: 'estudiante_id,fecha' });

    setSaving(false);
    if (error) {
      setMessage({ text: 'Error al guardar asistencia: ' + error.message, type: 'error' });
    } else {
      setMessage({ text: '¡Asistencia guardada correctamente!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const buscarReporte = async () => {
    if (!reporteCurso) return;
    setLoadingReporte(true);

    let query = supabase
      .from('asistencia')
      .select('fecha, estado, observacion, estudiantes(documento, nombres, apellidos), cursos(nombre), asignaturas(nombre)')
      .eq('curso_id', reporteCurso)
      .gte('fecha', reporteFechaInicio)
      .lte('fecha', reporteFechaFin);

    if (reporteAsignatura) query = query.eq('asignatura_id', reporteAsignatura);

    const { data, error } = await query.order('fecha', { ascending: false });

    setLoadingReporte(false);
    if (error) {
      setMessage({ text: 'Error al obtener reporte: ' + error.message, type: 'error' });
    } else {
      setDatosReporte(data || []);
    }
  };

  const exportarReporteExcel = () => {
    if (datosReporte.length === 0) return;

    const filas = datosReporte.map(item => ({
      Fecha: item.fecha,
      Curso: item.cursos?.nombre || '',
      Asignatura: item.asignaturas?.nombre || 'General',
      Documento: item.estudiantes?.documento || '',
      Estudiante: `${item.estudiantes?.apellidos || ''} ${item.estudiantes?.nombres || ''}`,
      Estado: item.estado,
      Observacion: item.observacion || ''
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Asistencia');
    XLSX.writeFile(wb, `Reporte_Asistencia_${reporteFechaInicio}_al_${reporteFechaFin}.xlsx`);
  };

  const crearCurso = async (e) => {
    e.preventDefault();
    if (!nuevoCurso.trim()) return;
    const { error } = await supabase.from('cursos').insert([{ nombre: nuevoCurso.trim() }]);
    if (!error) {
      setMessage({ text: '¡Curso creado correctamente!', type: 'success' });
      setNuevoCurso('');
      cargarDatosBasicos(session.user, perfil);
    }
  };

  const registrarEstudianteManual = async (e) => {
    e.preventDefault();
    if (!nuevoEstudiante.documento || !nuevoEstudiante.nombres || !nuevoEstudiante.apellidos || !nuevoEstudiante.curso_id) return;

    const { error } = await supabase.from('estudiantes').insert([{
      documento: nuevoEstudiante.documento.trim(),
      nombres: nuevoEstudiante.nombres.trim(),
      apellidos: nuevoEstudiante.apellidos.trim(),
      curso_id: nuevoEstudiante.curso_id
    }]);

    if (!error) {
      setMessage({ text: '¡Estudiante registrado con éxito!', type: 'success' });
      setNuevoEstudiante({ documento: '', nombres: '', apellidos: '', curso_id: nuevoEstudiante.curso_id });
      if (selectedCurso === nuevoEstudiante.curso_id) cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    }
  };

  const descargarPlantilla = () => {
    const data = [
      { Documento: '12345678', Nombres: 'Carlos', Apellidos: 'Gómez', Curso: '601' },
      { Documento: '87654321', Nombres: 'María', Apellidos: 'Pérez', Curso: '601' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, 'Plantilla_Estudiantes.xlsx');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setMessage({ text: 'El archivo Excel está vacío.', type: 'error' });
          return;
        }

        for (const row of data) {
          const nombreCurso = String(row.Curso || row.curso || '').trim();
          const doc = String(row.Documento || row.documento || '').trim();
          const nom = String(row.Nombres || row.nombres || '').trim();
          const ape = String(row.Apellidos || row.apellidos || '').trim();

          if (!nombreCurso || !doc || !nom || !ape) continue;

          let { data: cursoFound } = await supabase.from('cursos').select('id').eq('nombre', nombreCurso).maybeSingle();
          let cursoId = cursoFound?.id;

          if (!cursoId) {
            const { data: newC } = await supabase.from('cursos').insert([{ nombre: nombreCurso }]).select('id').single();
            cursoId = newC?.id;
          }

          if (cursoId) {
            await supabase.from('estudiantes').upsert([{
              documento: doc,
              nombres: nom,
              apellidos: ape,
              curso_id: cursoId
            }], { onConflict: 'documento' });
          }
        }

        setMessage({ text: '¡Carga masiva desde Excel completada con éxito!', type: 'success' });
        cargarDatosBasicos();
        if (selectedCurso) cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
      } catch (err) {
        setMessage({ text: 'Error al procesar el archivo Excel: ' + err.message, type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const registrarDocente = async (e) => {
    e.preventDefault();
    const userClean = nuevoDocente.usuario.trim().toLowerCase();
    
    if (!nuevoDocente.documento || !nuevoDocente.nombres || !nuevoDocente.apellidos || !userClean || !nuevoDocente.password) {
      setMessage({ text: 'Por favor completa todos los campos del docente.', type: 'error' });
      return;
    }

    const emailTecnico = `${userClean}@colegio.internal`;

    // 1. Guardar en tabla docentes
    const { data: docData, error: docErr } = await supabase.from('docentes').insert([{
      documento: nuevoDocente.documento.trim(),
      nombres: nuevoDocente.nombres.trim(),
      apellidos: nuevoDocente.apellidos.trim(),
      email: emailTecnico
    }]).select().single();

    if (docErr) {
      setMessage({ text: 'Error al registrar docente: ' + docErr.message, type: 'error' });
      return;
    }

    // 2. Crear credenciales en Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: emailTecnico,
      password: nuevoDocente.password
    });

    if (authErr) {
      setMessage({ text: 'Error al crear credenciales de acceso: ' + authErr.message, type: 'error' });
    } else if (authData.user) {
      // 3. Vincular perfil con rol 'docente' y su usuario
      await supabase.from('perfiles').insert([{
        id: authData.user.id,
        email: emailTecnico,
        usuario: userClean,
        rol: 'docente',
        docente_id: docData.id
      }]);

      setMessage({ text: `¡Docente '${userClean}' registrado y acceso creado!`, type: 'success' });
      setNuevoDocente({ documento: '', nombres: '', apellidos: '', usuario: '', password: '' });
      cargarDatosBasicos(session.user, perfil);
    }
  };

  const crearAsignatura = async (e) => {
    if (e) e.preventDefault();
    if (!nuevaAsignatura.trim()) return;

    const { data, error } = await supabase.from('asignaturas').insert([{ nombre: nuevaAsignatura.trim() }]).select().single();
    if (!error) {
      setMessage({ text: '¡Asignatura creada con éxito!', type: 'success' });
      setNuevaAsignatura('');
      const { data: aData } = await supabase.from('asignaturas').select('*').order('nombre');
      if (aData) setAsignaturas(aData);
      if (data?.id) setNuevaCarga(prev => ({ ...prev, asignatura_id: data.id }));
    }
  };

  const asignarCarga = async (e) => {
    e.preventDefault();
    if (!nuevaCarga.docente_id || !nuevaCarga.curso_id || !nuevaCarga.asignatura_id) return;

    const { error } = await supabase.from('carga_academica').insert([nuevaCarga]);
    if (!error) {
      setMessage({ text: '¡Carga asignada con éxito!', type: 'success' });
      setNuevaCarga({ docente_id: '', curso_id: '', asignatura_id: '' });
      cargarDatosBasicos(session.user, perfil);
    }
  };

  // --- PANTALLA DE LOGIN CON USUARIO Y CONTRASEÑA ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Asistencia Escolar</h1>
            <p className="text-xs text-slate-500">Ingresa con tu Usuario y Contraseña</p>
          </div>

          {message.text && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-600 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Usuario
              </label>
              <input
                type="text"
                required
                placeholder="Ej: mrodriguez o admin"
                value={usuarioAuth}
                onChange={(e) => setUsuarioAuth(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-600 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordAuth}
                onChange={(e) => setPasswordAuth(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-md transition"
            >
              {loadingAuth ? 'Verificando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Cursos y asignaturas filtrados por la carga del docente
  const cursosDisponibles = perfil?.rol === 'docente' 
    ? Array.from(new Set(docenteCarga.map(c => c.curso_id)))
        .map(id => cursos.find(c => c.id === id))
        .filter(Boolean)
    : cursos;

  const asignaturasDisponibles = perfil?.rol === 'docente'
    ? docenteCarga.filter(c => c.curso_id === selectedCurso).map(c => c.asignaturas)
    : asignaturas;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Encabezado */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Control de Asistencia Escolar</h1>
              <p className="text-blue-100 text-xs capitalize">
                Rol: {perfil?.rol || 'Usuario'} | Usuario: {perfil?.usuario || session.user.email.split('@')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-blue-700/60 p-1 rounded-lg gap-1">
              <button
                onClick={() => setView('docente')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${
                  view === 'docente' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Vista Docente
              </button>

              {perfil?.rol === 'admin' && (
                <>
                  <button
                    onClick={() => setView('reportes')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${
                      view === 'reportes' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Historial y Reportes
                  </button>
                  <button
                    onClick={() => setView('admin')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${
                      view === 'admin' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" /> Administrador
                  </button>
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 bg-blue-700 hover:bg-blue-800 rounded-lg text-white transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Mensajes */}
      {message.text && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'error' ? 'bg-red-100 border border-red-300 text-red-800' : 'bg-green-100 border border-green-300 text-green-800'
          }`}>
            {message.type === 'error' ? <XCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* VISTA DOCENTE */}
        {view === 'docente' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Curso</label>
                <select
                  value={selectedCurso}
                  onChange={(e) => setSelectedCurso(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  {cursosDisponibles.length === 0 && <option value="">Sin carga asignada</option>}
                  {cursosDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Asignatura</label>
                <select
                  value={selectedAsignatura}
                  onChange={(e) => setSelectedAsignatura(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  {asignaturasDisponibles.length === 0 && <option value="">Sin asignaturas</option>}
                  {asignaturasDisponibles.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Fecha
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 mt-1"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700">Estudiantes ({estudiantes.length})</h2>
                <span className="text-xs text-slate-500">Marcación de asistencia</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">Cargando lista...</div>
              ) : estudiantes.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No hay estudiantes registrados en este curso.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {estudiantes.map((est) => {
                    const estadoActual = asistencias[est.id]?.estado || 'Presente';
                    const obsActual = asistencias[est.id]?.observacion || '';

                    return (
                      <div key={est.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-800 capitalize">{est.apellidos} {est.nombres}</p>
                          <p className="text-xs text-slate-400">Doc: {est.documento}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex rounded-lg border border-slate-200 overflow-hidden p-1 bg-slate-100/70">
                            <button
                              type="button"
                              onClick={() => handleEstadoChange(est.id, 'Presente')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                                estadoActual === 'Presente' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Presente
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEstadoChange(est.id, 'Ausente')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                                estadoActual === 'Ausente' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Ausente
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEstadoChange(est.id, 'Evasión')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                                estadoActual === 'Evasión' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'
                              }`}
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> Evasión
                            </button>
                          </div>

                          {(estadoActual === 'Ausente' || estadoActual === 'Evasión') && (
                            <div className="w-full sm:w-64">
                              <input
                                type="text"
                                placeholder="Motivo / Observación..."
                                value={obsActual}
                                onChange={(e) => handleObservacionChange(est.id, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded-md bg-amber-50/50 text-slate-800"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {estudiantes.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={guardarAsistencia}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Asistencia'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA HISTORIAL Y REPORTES */}
        {view === 'reportes' && perfil?.rol === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Consulta de Historial y Exportación
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Curso</label>
                  <select
                    value={reporteCurso}
                    onChange={(e) => setReporteCurso(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1"
                  >
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Asignatura (Opcional)</label>
                  <select
                    value={reporteAsignatura}
                    onChange={(e) => setReporteAsignatura(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1"
                  >
                    <option value="">-- Todas las Materias --</option>
                    {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Fecha Inicio</label>
                  <input
                    type="date"
                    value={reporteFechaInicio}
                    onChange={(e) => setReporteFechaInicio(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Fecha Fin</label>
                  <input
                    type="date"
                    value={reporteFechaFin}
                    onChange={(e) => setReporteFechaFin(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={buscarReporte}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                >
                  Consultar Historial
                </button>
                {datosReporte.length > 0 && (
                  <button
                    onClick={exportarReporteExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                  >
                    <Download className="w-4 h-4" /> Exportar a Excel
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-100 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700">Registros Encontrados ({datosReporte.length})</h3>
              </div>

              {loadingReporte ? (
                <div className="p-8 text-center text-slate-500">Buscando registros...</div>
              ) : datosReporte.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Selecciona los filtros y presiona "Consultar Historial".</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                      <tr>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Materia</th>
                        <th className="p-3">Documento</th>
                        <th className="p-3">Estudiante</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {datosReporte.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-medium">{r.fecha}</td>
                          <td className="p-3 font-medium text-blue-600">{r.asignaturas?.nombre || 'General'}</td>
                          <td className="p-3">{r.estudiantes?.documento}</td>
                          <td className="p-3 font-semibold text-slate-800">{r.estudiantes?.apellidos} {r.estudiantes?.nombres}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.estado === 'Presente' ? 'bg-green-100 text-green-800' :
                              r.estado === 'Ausente' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.estado}
                            </span>
                          </td>
                          <td className="p-3 italic text-slate-500">{r.observacion || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA ADMINISTRADOR */}
        {view === 'admin' && perfil?.rol === 'admin' && (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-4">
              <button
                onClick={() => setAdminTab('estudiantes')}
                className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs border-b-2 transition ${
                  adminTab === 'estudiantes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                <Users className="w-4 h-4" /> Cursos y Estudiantes
              </button>
              <button
                onClick={() => setAdminTab('docentes')}
                className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs border-b-2 transition ${
                  adminTab === 'docentes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                <GraduationCap className="w-4 h-4" /> Perfiles de Docentes
              </button>
              <button
                onClick={() => setAdminTab('carga')}
                className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs border-b-2 transition ${
                  adminTab === 'carga' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Carga Académica
              </button>
            </div>

            {adminTab === 'estudiantes' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-blue-600" /> Importar Estudiantes desde Excel
                      </h2>
                      <p className="text-xs text-slate-500">Descarga la plantilla estructurada, llénala y súbela aquí.</p>
                    </div>
                    <button
                      onClick={descargarPlantilla}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"
                    >
                      <Download className="w-4 h-4" /> Descargar Plantilla Excel
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50 hover:bg-blue-50/30 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Haz clic para subir tu plantilla diligenciada</p>
                    <p className="text-xs text-slate-400 mt-1">Soporta archivos .XLSX</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-blue-600" /> Crear Nuevo Curso
                    </h2>
                    <form onSubmit={crearCurso} className="space-y-3">
                      <input
                        type="text"
                        placeholder="Ej: 601, 901"
                        value={nuevoCurso}
                        onChange={(e) => setNuevoCurso(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm"
                      />
                      <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg">
                        Guardar Curso
                      </button>
                    </form>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-600" /> Registrar Estudiante Manualmente
                    </h2>
                    <form onSubmit={registrarEstudianteManual} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Documento"
                          value={nuevoEstudiante.documento}
                          onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, documento: e.target.value })}
                          className="p-2 bg-slate-50 border rounded-lg text-xs"
                        />
                        <select
                          value={nuevoEstudiante.curso_id}
                          onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, curso_id: e.target.value })}
                          className="p-2 bg-slate-50 border rounded-lg text-xs"
                        >
                          <option value="">-- Seleccionar Curso --</option>
                          {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nombres"
                          value={nuevoEstudiante.nombres}
                          onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, nombres: e.target.value })}
                          className="p-2 bg-slate-50 border rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Apellidos"
                          value={nuevoEstudiante.apellidos}
                          onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, apellidos: e.target.value })}
                          className="p-2 bg-slate-50 border rounded-lg text-xs"
                        />
                      </div>
                      <button type="submit" className="w-full py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg">
                        Registrar Estudiante
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'docentes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" /> Crear Perfil de Docente con Acceso
                  </h2>
                  <form onSubmit={registrarDocente} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Documento"
                      value={nuevoDocente.documento}
                      onChange={(e) => setNuevoDocente({ ...nuevoDocente, documento: e.target.value })}
                      className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombres"
                        value={nuevoDocente.nombres}
                        onChange={(e) => setNuevoDocente({ ...nuevoDocente, nombres: e.target.value })}
                        className="p-2 bg-slate-50 border rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Apellidos"
                        value={nuevoDocente.apellidos}
                        onChange={(e) => setNuevoDocente({ ...nuevoDocente, apellidos: e.target.value })}
                        className="p-2 bg-slate-50 border rounded-lg text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre de Usuario (Ej: docente1)"
                      value={nuevoDocente.usuario}
                      onChange={(e) => setNuevoDocente({ ...nuevoDocente, usuario: e.target.value })}
                      className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-mono"
                    />
                    <input
                      type="password"
                      placeholder="Asignar Contraseña al Docente"
                      value={nuevoDocente.password}
                      onChange={(e) => setNuevoDocente({ ...nuevoDocente, password: e.target.value })}
                      className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
                    />
                    <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg">
                      Guardar Docente y Crear Acceso
                    </button>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h2 className="text-md font-bold text-slate-800">Docentes Registrados ({docentes.length})</h2>
                  <div className="divide-y max-h-60 overflow-y-auto">
                    {docentes.map(d => (
                      <div key={d.id} className="py-2 text-xs">
                        <p className="font-semibold text-slate-800">{d.apellidos} {d.nombres}</p>
                        <p className="text-slate-400">Doc: {d.documento}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'carga' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" /> Asignar Carga Académica
                  </h2>
                  <form onSubmit={asignarCarga} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Docente</label>
                      <select
                        value={nuevaCarga.docente_id}
                        onChange={(e) => setNuevaCarga({ ...nuevaCarga, docente_id: e.target.value })}
                        className="w-full p-2 bg-slate-50 border rounded-lg text-xs mt-1"
                      >
                        <option value="">-- Seleccionar Docente --</option>
                        {docentes.map(d => <option key={d.id} value={d.id}>{d.apellidos} {d.nombres}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500">Curso</label>
                      <select
                        value={nuevaCarga.curso_id}
                        onChange={(e) => setNuevaCarga({ ...nuevaCarga, curso_id: e.target.value })}
                        className="w-full p-2 bg-slate-50 border rounded-lg text-xs mt-1"
                      >
                        <option value="">-- Seleccionar Curso --</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500">Asignatura</label>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={nuevaCarga.asignatura_id}
                          onChange={(e) => setNuevaCarga({ ...nuevaCarga, asignatura_id: e.target.value })}
                          className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
                        >
                          <option value="">-- Seleccionar Asignatura --</option>
                          {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg">
                      Asignar Carga
                    </button>
                  </form>

                  <div className="pt-4 border-t">
                    <p className="text-xs font-semibold text-slate-600 mb-2">¿No está la asignatura en la lista?</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: Matemáticas"
                        value={nuevaAsignatura}
                        onChange={(e) => setNuevaAsignatura(e.target.value)}
                        className="p-2 bg-slate-50 border rounded-lg text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={crearAsignatura}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Crear
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h2 className="text-md font-bold text-slate-800">Cargas Académicas Asignadas ({cargas.length})</h2>
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {cargas.map(cg => (
                      <div key={cg.id} className="py-2 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{cg.docentes?.apellidos} {cg.docentes?.nombres}</p>
                          <p className="text-blue-600 font-medium">Curso: {cg.cursos?.nombre} | Materia: {cg.asignaturas?.nombre}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
