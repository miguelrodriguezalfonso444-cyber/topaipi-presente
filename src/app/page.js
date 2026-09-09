'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { 
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
  User,
  Trash2,
  Edit3,
  X
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
  const [todosPerfiles, setTodosPerfiles] = useState([]);
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

  // Formulario Administrador (Creación)
  const [nuevoCurso, setNuevoCurso] = useState('');
  const [nuevoEstudiante, setNuevoEstudiante] = useState({ documento: '', nombres: '', apellidos: '', curso_id: '' });
  const [nuevoUsuario, setNuevoUsuario] = useState({ documento: '', nombres: '', apellidos: '', usuario: '', password: '', rol: 'docente' });
  const [nuevaAsignatura, setNuevaAsignatura] = useState('');
  const [nuevaCarga, setNuevaCarga] = useState({ docente_id: '', curso_id: '', asignatura_id: '' });

  // Estados para Edición
  const [editandoEstudiante, setEditandoEstudiante] = useState(null);
  const [editandoDocente, setEditandoDocente] = useState(null);
  const [editandoAsignatura, setEditandoAsignatura] = useState(null);

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

    const { data: pData } = await supabase.from('perfiles').select('*, docentes(nombres, apellidos, documento)');
    if (pData) setTodosPerfiles(pData);

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
    if (session && selectedCurso) {
      cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    }
  }, [selectedCurso, selectedAsignatura, fecha, session]);

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
    XLSX.writeFile(wb, `Reporte_IED_Topaipi_${reporteFechaInicio}_al_${reporteFechaFin}.xlsx`);
  };

  // --- MÓDULOS DE ADMINISTRACIÓN (CREAR / EDITAR / ELIMINAR) ---

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

  const eliminarCurso = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar el curso '${nombre}' y todos sus estudiantes vinculados?`)) return;
    const { error } = await supabase.from('cursos').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Curso eliminado correctamente.', type: 'success' });
      cargarDatosBasicos(session.user, perfil);
    } else {
      setMessage({ text: 'Error al eliminar curso: ' + error.message, type: 'error' });
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
      cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    }
  };

  const guardarEdicionEstudiante = async (e) => {
    e.preventDefault();
    if (!editandoEstudiante) return;

    const { error } = await supabase.from('estudiantes').update({
      documento: editandoEstudiante.documento,
      nombres: editandoEstudiante.nombres,
      apellidos: editandoEstudiante.apellidos,
      curso_id: editandoEstudiante.curso_id
    }).eq('id', editandoEstudiante.id);

    if (!error) {
      setMessage({ text: '¡Datos del estudiante actualizados!', type: 'success' });
      setEditandoEstudiante(null);
      cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    } else {
      setMessage({ text: 'Error al actualizar estudiante: ' + error.message, type: 'error' });
    }
  };

  const eliminarEstudiante = async (id, nombre) => {
    if (!confirm(`¿Eliminar al estudiante ${nombre}?`)) return;
    const { error } = await supabase.from('estudiantes').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Estudiante eliminado con éxito.', type: 'success' });
      cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    } else {
      setMessage({ text: 'Error al eliminar: ' + error.message, type: 'error' });
    }
  };

  // REGISTRO DE USUARIOS (DOCENTE O ADMINISTRADOR)
  const registrarUsuarioAcceso = async (e) => {
    e.preventDefault();
    const userClean = nuevoUsuario.usuario.trim().toLowerCase();
    
    if (!userClean || !nuevoUsuario.password) {
      setMessage({ text: 'Por favor asigna un Nombre de Usuario y Contraseña.', type: 'error' });
      return;
    }

    const emailTecnico = `${userClean}@colegio.internal`;

    if (nuevoUsuario.rol === 'docente') {
      if (!nuevoUsuario.documento || !nuevoUsuario.nombres || !nuevoUsuario.apellidos) {
        setMessage({ text: 'Por favor completa todos los campos del docente.', type: 'error' });
        return;
      }

      // 1. Guardar en tabla docentes
      const { data: docData, error: docErr } = await supabase.from('docentes').insert([{
        documento: nuevoUsuario.documento.trim(),
        nombres: nuevoUsuario.nombres.trim(),
        apellidos: nuevoUsuario.apellidos.trim(),
        email: emailTecnico
      }]).select().single();

      if (docErr) {
        setMessage({ text: 'Error al registrar docente: ' + docErr.message, type: 'error' });
        return;
      }

      // 2. Crear cuenta Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: emailTecnico,
        password: nuevoUsuario.password
      });

      if (authErr) {
        setMessage({ text: 'Error al crear credenciales de acceso: ' + authErr.message, type: 'error' });
        return;
      }

      if (authData.user) {
        await supabase.from('perfiles').insert([{
          id: authData.user.id,
          email: emailTecnico,
          usuario: userClean,
          rol: 'docente',
          docente_id: docData.id
        }]);

        setMessage({ text: `¡Docente '${userClean}' registrado con éxito!`, type: 'success' });
      }
    } else {
      // REGISTRO DE ADMINISTRADOR
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: emailTecnico,
        password: nuevoUsuario.password
      });

      if (authErr) {
        setMessage({ text: 'Error al crear credenciales de administrador: ' + authErr.message, type: 'error' });
        return;
      }

      if (authData.user) {
        await supabase.from('perfiles').insert([{
          id: authData.user.id,
          email: emailTecnico,
          usuario: userClean,
          rol: 'admin'
        }]);

        setMessage({ text: `¡Administrador '${userClean}' registrado con acceso total!`, type: 'success' });
      }
    }

    setNuevoUsuario({ documento: '', nombres: '', apellidos: '', usuario: '', password: '', rol: 'docente' });
    cargarDatosBasicos(session.user, perfil);
  };

  const guardarEdicionDocente = async (e) => {
    e.preventDefault();
    if (!editandoDocente) return;

    const { error } = await supabase.from('docentes').update({
      documento: editandoDocente.documento,
      nombres: editandoDocente.nombres,
      apellidos: editandoDocente.apellidos
    }).eq('id', editandoDocente.id);

    if (!error) {
      setMessage({ text: '¡Información del docente actualizada!', type: 'success' });
      setEditandoDocente(null);
      cargarDatosBasicos(session.user, perfil);
    } else {
      setMessage({ text: 'Error al actualizar docente: ' + error.message, type: 'error' });
    }
  };

  const eliminarDocente = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar al docente ${nombre}?`)) return;
    const { error } = await supabase.from('docentes').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Docente eliminado correctamente.', type: 'success' });
      cargarDatosBasicos(session.user, perfil);
    } else {
      setMessage({ text: 'Error al eliminar docente: ' + error.message, type: 'error' });
    }
  };

  const eliminarPerfilUsuario = async (id, usuario) => {
    if (!confirm(`¿Deseas eliminar el usuario de acceso '${usuario}'?`)) return;
    const { error } = await supabase.from('perfiles').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Usuario eliminado.', type: 'success' });
      cargarDatosBasicos(session.user, perfil);
    } else {
      setMessage({ text: 'Error al eliminar el usuario: ' + error.message, type: 'error' });
    }
  };

  const crearAsignatura = async (e) => {
    if (e) e.preventDefault();
    if (!nuevaAsignatura.trim()) return;

    const { data, error } = await supabase.from('asignaturas').insert([{ nombre: nuevaAsignatura.trim() }]).select().single();
    if (!error) {
      setMessage({ text: '¡Asignatura creada con éxito!', type: 'success' });
      setNuevaAsignatura('');
      cargarDatosBasicos(session.user, perfil);
      if (data?.id) setNuevaCarga(prev => ({ ...prev, asignatura_id: data.id }));
    }
  };

  const guardarEdicionAsignatura = async (e) => {
    e.preventDefault();
    if (!editandoAsignatura) return;

    const { error } = await supabase.from('asignaturas').update({
      nombre: editandoAsignatura.nombre
    }).eq('id', editandoAsignatura.id);

    if (!error) {
      setMessage({ text: '¡Asignatura actualizada!', type: 'success' });
      setEditandoAsignatura(null);
      cargarDatosBasicos(session.user, perfil);
    } else {
      setMessage({ text: 'Error al actualizar asignatura: ' + error.message, type: 'error' });
    }
  };

  const eliminarAsignatura = async (id, nombre) => {
    if (!confirm(`¿Eliminar la asignatura '${nombre}'?`)) return;
    const { error } = await supabase.from('asignaturas').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Asignatura eliminada.', type: 'success' });
      cargarDatosBasicos(session.user, perfil);
    } else {
      setMessage({ text: 'Error al eliminar asignatura: ' + error.message, type: 'error' });
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

  const eliminarCarga = async (id) => {
    if (!confirm('¿Deseas quitar esta asignación de carga académica?')) return;
    const { error } = await supabase.from('carga_academica').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Carga académica eliminada.', type: 'success' });
      cargarDatosBasicos(session.user, perfil);
    } else {
      setMessage({ text: 'Error al quitar carga: ' + error.message, type: 'error' });
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
    XLSX.writeFile(wb, 'Plantilla_Estudiantes_Topaipi.xlsx');
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
        cargarDatosBasicos(session.user, perfil);
        if (selectedCurso) cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
      } catch (err) {
        setMessage({ text: 'Error al procesar el archivo Excel: ' + err.message, type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- PANTALLA DE LOGIN CON MARCA INSTITUCIONAL ---
  if (!session) {
    return (
      <div className="min-h-screen bg-emerald-900/10 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-200">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-emerald-100 p-2">
              <img src="/escudo.png" alt="Escudo IED Topaipí" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Topaipí Presente</h1>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mt-0.5">
                Institución Educativa Departamental de Topaipí
              </p>
            </div>
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
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
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
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-lg shadow-md transition"
            >
              {loadingAuth ? 'Ingresando...' : 'Ingresar al Sistema'}
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
      {/* Encabezado Institucional */}
      <header className="bg-emerald-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg p-1 shadow-sm flex items-center justify-center shrink-0">
              <img src="/escudo.png" alt="Escudo IED Topaipí" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Topaipí Presente</h1>
              <p className="text-emerald-100 text-xs font-medium">
                IED Topaipí • Rol: <span className="capitalize">{perfil?.rol || 'Usuario'}</span> ({perfil?.usuario || session.user.email.split('@')[0]})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-emerald-900/60 p-1 rounded-lg gap-1">
              <button
                onClick={() => setView('docente')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${
                  view === 'docente' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Vista Docente
              </button>

              {perfil?.rol === 'admin' && (
                <>
                  <button
                    onClick={() => setView('reportes')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${
                      view === 'reportes' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Historial y Reportes
                  </button>
                  <button
                    onClick={() => setView('admin')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${
                      view === 'admin' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'
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
              className="p-2 bg-emerald-900 hover:bg-emerald-950 rounded-lg text-white transition"
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 mt-1"
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 mt-1"
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
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700">Estudiantes ({estudiantes.length})</h2>
                <span className="text-xs text-slate-500">Marcación de asistencia diaria</span>
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
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-sm transition"
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
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" /> Historial de Asistencia - IED Topaipí
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
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition"
                >
                  Consultar Historial
                </button>
                {datosReporte.length > 0 && (
                  <button
                    onClick={exportarReporteExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition"
                  >
                    <Download className="w-4 h-4" /> Exportar Excel (.XLSX)
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
                          <td className="p-3 font-medium text-emerald-700">{r.asignaturas?.nombre || 'General'}</td>
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
                  adminTab === 'estudiantes' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'
                }`}
              >
                <Users className="w-4 h-4" /> Cursos y Estudiantes
              </button>
              <button
                onClick={() => setAdminTab('docentes')}
                className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs border-b-2 transition ${
                  adminTab === 'docentes' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'
                }`}
              >
                <GraduationCap className="w-4 h-4" /> Usuarios y Accesos
              </button>
              <button
                onClick={() => setAdminTab('carga')}
                className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs border-b-2 transition ${
                  adminTab === 'carga' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Carga Académica
              </button>
            </div>

            {/* TAB: ESTUDIANTES Y CURSOS */}
            {adminTab === 'estudiantes' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-emerald-700" /> Importar Estudiantes desde Excel
                      </h2>
                      <p className="text-xs text-slate-500">Descarga la plantilla estructurada, llénala y súbela aquí.</p>
                    </div>
                    <button
                      onClick={descargarPlantilla}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"
                    >
                      <Download className="w-4 h-4" /> Plantilla Excel
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center bg-slate-50 hover:bg-emerald-50/30 transition cursor-pointer relative">
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
                  {/* Crear Curso / Lista de Cursos */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-emerald-700" /> Crear / Gestionar Cursos
                    </h2>
                    <form onSubmit={crearCurso} className="space-y-3">
                      <input
                        type="text"
                        placeholder="Ej: 601, 901"
                        value={nuevoCurso}
                        onChange={(e) => setNuevoCurso(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm"
                      />
                      <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg">
                        Guardar Curso
                      </button>
                    </form>

                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Cursos Existentes ({cursos.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {cursos.map(c => (
                          <div key={c.id} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                            <span>{c.nombre}</span>
                            <button
                              type="button"
                              onClick={() => eliminarCurso(c.id, c.nombre)}
                              className="text-red-500 hover:text-red-700 ml-1"
                              title="Eliminar curso"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Registrar Estudiante Manualmente */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-emerald-700" /> Registrar Estudiante Manualmente
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
                      <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg">
                        Registrar Estudiante
                      </button>
                    </form>
                  </div>
                </div>

                {/* Formulario de Edición de Estudiante */}
                {editandoEstudiante && (
                  <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-amber-900 text-xs uppercase flex items-center gap-1">
                        <Edit3 className="w-4 h-4" /> Editando Estudiante: {editandoEstudiante.nombres} {editandoEstudiante.apellidos}
                      </h3>
                      <button onClick={() => setEditandoEstudiante(null)} className="text-slate-500 hover:text-slate-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={guardarEdicionEstudiante} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Documento"
                        value={editandoEstudiante.documento}
                        onChange={(e) => setEditandoEstudiante({ ...editandoEstudiante, documento: e.target.value })}
                        className="p-2 bg-white border rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Nombres"
                        value={editandoEstudiante.nombres}
                        onChange={(e) => setEditandoEstudiante({ ...editandoEstudiante, nombres: e.target.value })}
                        className="p-2 bg-white border rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Apellidos"
                        value={editandoEstudiante.apellidos}
                        onChange={(e) => setEditandoEstudiante({ ...editandoEstudiante, apellidos: e.target.value })}
                        className="p-2 bg-white border rounded-lg text-xs"
                      />
                      <button type="submit" className="py-2 bg-amber-600 text-white font-bold text-xs rounded-lg">
                        Guardar Cambios
                      </button>
                    </form>
                  </div>
                )}

                {/* Lista de Estudiantes Registrados */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">
                      Estudiantes en el curso seleccionado ({estudiantes.length})
                    </h3>
                    <select
                      value={selectedCurso}
                      onChange={(e) => setSelectedCurso(e.target.value)}
                      className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                    >
                      {cursos.map(c => <option key={c.id} value={c.id}>Curso: {c.nombre}</option>)}
                    </select>
                  </div>

                  <div className="divide-y max-h-80 overflow-y-auto">
                    {estudiantes.map(est => (
                      <div key={est.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <p className="font-semibold text-slate-800 capitalize">{est.apellidos} {est.nombres}</p>
                          <p className="text-slate-400">Doc: {est.documento}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditandoEstudiante(est)}
                            className="p-1.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition"
                            title="Editar estudiante"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => eliminarEstudiante(est.id, `${est.nombres} ${est.apellidos}`)}
                            className="p-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
                            title="Eliminar estudiante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USUARIOS Y ACCESOS (DOCENTES Y ADMINISTRADORES) */}
            {adminTab === 'docentes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-700" /> Crear Cuenta de Acceso
                  </h2>
                  
                  <form onSubmit={registrarUsuarioAcceso} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Rol de Usuario</label>
                      <select
                        value={nuevoUsuario.rol}
                        onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1 font-semibold text-emerald-800"
                      >
                        <option value="docente">Docente</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    {nuevoUsuario.rol === 'docente' && (
                      <>
                        <input
                          type="text"
                          placeholder="Documento Identidad"
                          value={nuevoUsuario.documento}
                          onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, documento: e.target.value })}
                          className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nombres"
                            value={nuevoUsuario.nombres}
                            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombres: e.target.value })}
                            className="p-2 bg-slate-50 border rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Apellidos"
                            value={nuevoUsuario.apellidos}
                            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, apellidos: e.target.value })}
                            className="p-2 bg-slate-50 border rounded-lg text-xs"
                          />
                        </div>
                      </>
                    )}

                    <input
                      type="text"
                      placeholder="Nombre de Usuario (Ej: admin2 o docente1)"
                      value={nuevoUsuario.usuario}
                      onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, usuario: e.target.value })}
                      className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-mono"
                    />
                    <input
                      type="password"
                      placeholder="Asignar Contraseña"
                      value={nuevoUsuario.password}
                      onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                      className="w-full p-2 bg-slate-50 border rounded-lg text-xs"
                    />

                    <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm">
                      Crear Cuenta {nuevoUsuario.rol === 'admin' ? 'de Administrador' : 'de Docente'}
                    </button>
                  </form>
                </div>

                {/* Lista de Usuarios (Admins y Docentes) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h2 className="text-md font-bold text-slate-800">Cuentas Registradas ({todosPerfiles.length})</h2>

                  <div className="divide-y max-h-80 overflow-y-auto">
                    {todosPerfiles.map(p => (
                      <div key={p.id} className="py-2.5 text-xs flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{p.usuario}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {p.rol === 'admin' ? 'ADMINISTRADOR' : 'DOCENTE'}
                            </span>
                          </div>
                          {p.docentes && (
                            <p className="text-slate-500 mt-0.5">{p.docentes.apellidos} {p.docentes.nombres}</p>
                          )}
                        </div>

                        <button
                          onClick={() => eliminarPerfilUsuario(p.id, p.usuario)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Eliminar acceso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CARGA ACADÉMICA Y ASIGNATURAS */}
            {adminTab === 'carga' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-700" /> Asignar Carga Académica
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

                    <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg">
                      Asignar Carga
                    </button>
                  </form>

                  {/* Crear / Editar / Eliminar Asignaturas */}
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-xs font-semibold text-slate-600">Gestión de Asignaturas:</p>

                    {editandoAsignatura ? (
                      <form onSubmit={guardarEdicionAsignatura} className="flex gap-2">
                        <input
                          type="text"
                          value={editandoAsignatura.nombre}
                          onChange={(e) => setEditandoAsignatura({ ...editandoAsignatura, nombre: e.target.value })}
                          className="p-2 bg-white border border-amber-300 rounded-lg text-xs flex-1"
                        />
                        <button type="submit" className="px-3 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg">
                          Guardar
                        </button>
                        <button type="button" onClick={() => setEditandoAsignatura(null)} className="px-2 py-2 text-slate-500">
                          <X className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
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
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {asignaturas.map(a => (
                        <div key={a.id} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">
                          <span>{a.nombre}</span>
                          <button onClick={() => setEditandoAsignatura(a)} className="text-amber-600 hover:text-amber-800 ml-1">
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button onClick={() => eliminarAsignatura(a.id, a.nombre)} className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lista de Cargas Asignadas */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h2 className="text-md font-bold text-slate-800">Cargas Académicas Asignadas ({cargas.length})</h2>
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {cargas.map(cg => (
                      <div key={cg.id} className="py-2 text-xs flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <p className="font-semibold text-slate-800">{cg.docentes?.apellidos} {cg.docentes?.nombres}</p>
                          <p className="text-emerald-700 font-medium">Curso: {cg.cursos?.nombre} | Materia: {cg.asignaturas?.nombre}</p>
                        </div>
                        <button
                          onClick={() => eliminarCarga(cg.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title="Quitar esta carga"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
