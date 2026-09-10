'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { 
  UserCheck, ShieldCheck, Upload, Download, PlusCircle, UserPlus, 
  CheckCircle, XCircle, AlertCircle, Save, Calendar, FileSpreadsheet, 
  Users, Briefcase, GraduationCap, LogOut, Lock, User, Trash2, Edit3, X,
  Clock, ArrowRightLeft, Key
} from 'lucide-react';

export default function Home() {
  // Autenticación y Sesión
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [usuarioAuth, setUsuarioAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Cambio de contraseña propio
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

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
  const [editandoPerfil, setEditandoPerfil] = useState(null);

  // Estados Promoción de Curso
  const [promoOrigen, setPromoOrigen] = useState('');
  const [promoDestino, setPromoDestino] = useState('');

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

  const cambiarMiContrasena = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ text: 'Error al cambiar contraseña: ' + error.message, type: 'error' });
    } else {
      setMessage({ text: '¡Contraseña actualizada con éxito!', type: 'success' });
      setShowPasswordChange(false);
      setNewPassword('');
    }
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

  // --- HISTORIAL Y REPORTES ---
  const buscarReporte = async () => {
    if (!reporteCurso) return;
    setLoadingReporte(true);

    let query = supabase
      .from('asistencia')
      .select('id, fecha, estado, observacion, estudiantes(documento, nombres, apellidos), cursos(nombre), asignaturas(nombre)')
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
      Documento: item.estudiantes?.documento || 'Sin Doc',
      Estudiante: `${item.estudiantes?.apellidos || ''} ${item.estudiantes?.nombres || ''}`,
      Estado: item.estado,
      Observacion: item.observacion || ''
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Asistencia');
    XLSX.writeFile(wb, `Reporte_IED_Topaipi_${reporteFechaInicio}_al_${reporteFechaFin}.xlsx`);
  };

  const eliminarRegistroHistorial = async (id) => {
    if (!confirm('¿Eliminar este registro individual de asistencia?')) return;
    const { error } = await supabase.from('asistencia').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Registro eliminado con éxito.', type: 'success' });
      buscarReporte();
    }
  };

  const limpiarHistorialCompleto = async () => {
    if (datosReporte.length === 0) return;
    const confirmacion = prompt(`ADVERTENCIA: Vas a eliminar ${datosReporte.length} registros del historial que estás viendo en pantalla.\n\nEscribe "ELIMINAR" para confirmar esta acción.`);
    
    if (confirmacion === 'ELIMINAR') {
      setLoadingReporte(true);
      const ids = datosReporte.map(r => r.id);
      const { error } = await supabase.from('asistencia').delete().in('id', ids);
      setLoadingReporte(false);
      
      if (!error) {
        setMessage({ text: 'Historial en pantalla eliminado por completo.', type: 'success' });
        setDatosReporte([]);
      } else {
        setMessage({ text: 'Error al limpiar historial: ' + error.message, type: 'error' });
      }
    }
  };

  // --- ADMINISTRACIÓN: ESTUDIANTES Y CURSOS ---
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
    if (!nuevoEstudiante.nombres || !nuevoEstudiante.apellidos || !nuevoEstudiante.curso_id) {
      setMessage({ text: 'Nombres, Apellidos y Curso son obligatorios.', type: 'error' });
      return;
    }

    // Generar documento aleatorio si no se proporciona
    const docFinal = nuevoEstudiante.documento.trim() || `SD-${Date.now().toString().slice(-6)}`;

    const { error } = await supabase.from('estudiantes').insert([{
      documento: docFinal,
      nombres: nuevoEstudiante.nombres.trim(),
      apellidos: nuevoEstudiante.apellidos.trim(),
      curso_id: nuevoEstudiante.curso_id
    }]);

    if (!error) {
      setMessage({ text: '¡Estudiante registrado con éxito!', type: 'success' });
      setNuevoEstudiante({ documento: '', nombres: '', apellidos: '', curso_id: nuevoEstudiante.curso_id });
      cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    } else {
      setMessage({ text: 'Error al registrar: ' + error.message, type: 'error' });
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

  const promoverCursoCompleto = async () => {
    if (!promoOrigen || !promoDestino) {
      setMessage({ text: 'Seleccione curso de origen y de destino.', type: 'error' });
      return;
    }
    if (!confirm('¿Estás seguro de trasladar a TODOS los estudiantes del curso de origen al curso de destino?')) return;

    const { error } = await supabase
      .from('estudiantes')
      .update({ curso_id: promoDestino })
      .eq('curso_id', promoOrigen);

    if (!error) {
      setMessage({ text: '¡Promoción / Traslado masivo completado con éxito!', type: 'success' });
      setPromoOrigen('');
      setPromoDestino('');
      cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
    } else {
      setMessage({ text: 'Error en la promoción: ' + error.message, type: 'error' });
    }
  };

  const descargarPlantilla = () => {
    const data = [
      { Documento: '12345678 (Opcional)', Nombres: 'Carlos', Apellidos: 'Gómez', Curso: '601' },
      { Documento: '', Nombres: 'María', Apellidos: 'Pérez', Curso: '601' }
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

        let agregados = 0;

        for (const row of data) {
          const nombreCurso = String(row.Curso || row.curso || '').trim();
          const doc = String(row.Documento || row.documento || '').trim() || `SD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
          const nom = String(row.Nombres || row.nombres || '').trim();
          const ape = String(row.Apellidos || row.apellidos || '').trim();

          if (!nombreCurso || !nom || !ape) continue;

          // Buscar o crear curso
          let { data: cursoFound } = await supabase.from('cursos').select('id').eq('nombre', nombreCurso).maybeSingle();
          let cursoId = cursoFound?.id;

          if (!cursoId) {
            const { data: newC } = await supabase.from('cursos').insert([{ nombre: nombreCurso }]).select('id').single();
            cursoId = newC?.id;
          }

          if (cursoId) {
            // Verificar si el estudiante ya existe por nombres y apellidos en ese curso
            const { data: existe } = await supabase
              .from('estudiantes')
              .select('id')
              .eq('nombres', nom)
              .eq('apellidos', ape)
              .eq('curso_id', cursoId)
              .maybeSingle();

            if (!existe) {
              await supabase.from('estudiantes').insert([{
                documento: doc,
                nombres: nom,
                apellidos: ape,
                curso_id: cursoId
              }]);
              agregados++;
            }
          }
        }

        setMessage({ text: `¡Carga desde Excel exitosa! Se agregaron ${agregados} estudiantes nuevos.`, type: 'success' });
        cargarDatosBasicos(session.user, perfil);
        if (selectedCurso) cargarEstudiantesYAsistencia(selectedCurso, selectedAsignatura, fecha);
      } catch (err) {
        setMessage({ text: 'Error al procesar el archivo Excel: ' + err.message, type: 'error' });
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- ADMINISTRACIÓN: USUARIOS ---
  const registrarUsuarioAcceso = async (e) => {
    e.preventDefault();
    const userClean = nuevoUsuario.usuario.trim().toLowerCase();
    
    if (!userClean || !nuevoUsuario.password) {
      setMessage({ text: 'Por favor asigna un Nombre de Usuario y Contraseña.', type: 'error' });
      return;
    }

    const emailTecnico = `${userClean}@colegio.internal`;

    if (nuevoUsuario.rol === 'docente') {
      if (!nuevoUsuario.nombres || !nuevoUsuario.apellidos) {
        setMessage({ text: 'Por favor completa nombres y apellidos del docente.', type: 'error' });
        return;
      }

      const docFinal = nuevoUsuario.documento.trim() || `SD-${Date.now().toString().slice(-6)}`;

      const { data: docData, error: docErr } = await supabase.from('docentes').insert([{
        documento: docFinal,
        nombres: nuevoUsuario.nombres.trim(),
        apellidos: nuevoUsuario.apellidos.trim(),
        email: emailTecnico
      }]).select().single();

      if (docErr) {
        setMessage({ text: 'Error al registrar docente: ' + docErr.message, type: 'error' });
        return;
      }

      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: emailTecnico, password: nuevoUsuario.password });
      if (authErr) {
        setMessage({ text: 'Error credenciales de acceso: ' + authErr.message, type: 'error' });
        return;
      }

      if (authData.user) {
        await supabase.from('perfiles').insert([{ id: authData.user.id, email: emailTecnico, usuario: userClean, rol: 'docente', docente_id: docData.id }]);
        setMessage({ text: `¡Docente '${userClean}' registrado con éxito!`, type: 'success' });
      }
    } else {
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: emailTecnico, password: nuevoUsuario.password });
      if (authErr) {
        setMessage({ text: 'Error credenciales de administrador: ' + authErr.message, type: 'error' });
        return;
      }

      if (authData.user) {
        await supabase.from('perfiles').insert([{ id: authData.user.id, email: emailTecnico, usuario: userClean, rol: 'admin' }]);
        setMessage({ text: `¡Administrador '${userClean}' registrado con acceso total!`, type: 'success' });
      }
    }

    setNuevoUsuario({ documento: '', nombres: '', apellidos: '', usuario: '', password: '', rol: 'docente' });
    cargarDatosBasicos(session.user, perfil);
  };

  const guardarEdicionPerfil = async (e) => {
    e.preventDefault();
    if (!editandoPerfil) return;

    // Actualizar nombre de usuario en perfiles
    const userClean = editandoPerfil.usuario.trim().toLowerCase();
    await supabase.from('perfiles').update({ usuario: userClean, rol: editandoPerfil.rol }).eq('id', editandoPerfil.id);

    // Si es docente, actualizar sus datos personales
    if (editandoPerfil.docente_id && editandoPerfil.docentes) {
      await supabase.from('docentes').update({
        nombres: editandoPerfil.docentes.nombres,
        apellidos: editandoPerfil.docentes.apellidos,
        documento: editandoPerfil.docentes.documento
      }).eq('id', editandoPerfil.docente_id);
    }

    setMessage({ text: '¡Perfil de usuario actualizado!', type: 'success' });
    setEditandoPerfil(null);
    cargarDatosBasicos(session.user, perfil);
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

  // --- ADMINISTRACIÓN: ASIGNATURAS Y CARGAS ---
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
    const { error } = await supabase.from('asignaturas').update({ nombre: editandoAsignatura.nombre }).eq('id', editandoAsignatura.id);
    if (!error) {
      setMessage({ text: '¡Asignatura actualizada!', type: 'success' });
      setEditandoAsignatura(null);
      cargarDatosBasicos(session.user, perfil);
    }
  };

  const eliminarAsignatura = async (id, nombre) => {
    if (!confirm(`¿Eliminar la asignatura '${nombre}'?`)) return;
    const { error } = await supabase.from('asignaturas').delete().eq('id', id);
    if (!error) {
      setMessage({ text: 'Asignatura eliminada.', type: 'success' });
      cargarDatosBasicos(session.user, perfil);
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
    }
  };

  // --- RENDERIZADO DE LOGIN ---
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
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mt-0.5">Institución Educativa Departamental de Topaipí</p>
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
              <label className="text-xs font-semibold uppercase text-slate-600 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Usuario</label>
              <input type="text" required placeholder="Ej: mrodriguez o admin" value={usuarioAuth} onChange={(e) => setUsuarioAuth(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-600 flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Contraseña</label>
              <input type="password" required placeholder="••••••••" value={passwordAuth} onChange={(e) => setPasswordAuth(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500" />
            </div>
            <button type="submit" disabled={loadingAuth} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-lg shadow-md transition">
              {loadingAuth ? 'Ingresando...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const cursosDisponibles = perfil?.rol === 'docente' 
    ? Array.from(new Set(docenteCarga.map(c => c.curso_id))).map(id => cursos.find(c => c.id === id)).filter(Boolean)
    : cursos;
  const asignaturasDisponibles = perfil?.rol === 'docente'
    ? docenteCarga.filter(c => c.curso_id === selectedCurso).map(c => c.asignaturas)
    : asignaturas;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      {/* Encabezado Institucional */}
      <header className="bg-emerald-800 text-white shadow-md relative">
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
              <button onClick={() => setView('docente')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${view === 'docente' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'}`}>
                <UserCheck className="w-4 h-4" /> Asistencia
              </button>
              {perfil?.rol === 'admin' && (
                <>
                  <button onClick={() => setView('reportes')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${view === 'reportes' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'}`}>
                    <FileSpreadsheet className="w-4 h-4" /> Reportes
                  </button>
                  <button onClick={() => setView('admin')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs md:text-sm transition ${view === 'admin' ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-100 hover:text-white'}`}>
                    <ShieldCheck className="w-4 h-4" /> Admin
                  </button>
                </>
              )}
            </div>
            
            <button onClick={() => setShowPasswordChange(!showPasswordChange)} title="Cambiar Contraseña" className="p-2 bg-emerald-900 hover:bg-emerald-950 rounded-lg text-white transition">
              <Key className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} title="Cerrar Sesión" className="p-2 bg-emerald-900 hover:bg-emerald-950 rounded-lg text-white transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Cambio de Contraseña */}
      {showPasswordChange && (
        <div className="max-w-6xl mx-auto px-4 mt-2">
          <form onSubmit={cambiarMiContrasena} className="bg-slate-800 p-4 rounded-lg flex items-end gap-4 shadow-lg text-white">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-300">Nueva Contraseña para tu cuenta</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full p-2 mt-1 rounded bg-slate-700 border-slate-600 text-sm focus:ring-emerald-500" />
            </div>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-sm font-bold transition">Actualizar</button>
            <button type="button" onClick={() => setShowPasswordChange(false)} className="px-4 py-2 text-slate-300 hover:text-white text-sm">Cancelar</button>
          </form>
        </div>
      )}

      {/* Banner de Mensajes */}
      {message.text && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className={`p-4 rounded-lg flex items-center justify-between gap-3 shadow-sm ${message.type === 'error' ? 'bg-red-100 border border-red-300 text-red-800' : 'bg-green-100 border border-green-300 text-green-800'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'error' ? <XCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
            <button onClick={() => setMessage({ text: '', type: '' })}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* VISTA DOCENTE (ASISTENCIA) */}
        {view === 'docente' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Curso</label>
                <select value={selectedCurso} onChange={(e) => setSelectedCurso(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium mt-1">
                  {cursosDisponibles.length === 0 && <option value="">Sin carga asignada</option>}
                  {cursosDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Asignatura</label>
                <select value={selectedAsignatura} onChange={(e) => setSelectedAsignatura(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium mt-1">
                  {asignaturasDisponibles.length === 0 && <option value="">Sin asignaturas</option>}
                  {asignaturasDisponibles.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium mt-1" />
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
                      <div key={est.id} className="p-4 hover:bg-slate-50 transition flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 capitalize">{est.apellidos} {est.nombres}</p>
                          <p className="text-xs text-slate-400">Doc: {est.documento || 'Sin doc'}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex flex-wrap rounded-lg border border-slate-200 overflow-hidden p-1 bg-slate-100/70 gap-1">
                            <button type="button" onClick={() => handleEstadoChange(est.id, 'Presente')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${estadoActual === 'Presente' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                              <CheckCircle className="w-3.5 h-3.5" /> Presente
                            </button>
                            <button type="button" onClick={() => handleEstadoChange(est.id, 'Llegada Tarde')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${estadoActual === 'Llegada Tarde' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                              <Clock className="w-3.5 h-3.5" /> Llegada Tarde
                            </button>
                            <button type="button" onClick={() => handleEstadoChange(est.id, 'Ausente')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${estadoActual === 'Ausente' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                              <XCircle className="w-3.5 h-3.5" /> Ausente
                            </button>
                            <button type="button" onClick={() => handleEstadoChange(est.id, 'Evasión')} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${estadoActual === 'Evasión' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                              <AlertCircle className="w-3.5 h-3.5" /> Evasión
                            </button>
                          </div>

                          {(estadoActual === 'Ausente' || estadoActual === 'Evasión' || estadoActual === 'Llegada Tarde') && (
                            <div className="w-full sm:w-56 shrink-0">
                              <input type="text" placeholder="Motivo / Observación..." value={obsActual} onChange={(e) => handleObservacionChange(est.id, e.target.value)} className={`w-full px-2.5 py-1.5 text-xs border rounded-md text-slate-800 ${estadoActual === 'Llegada Tarde' ? 'border-blue-300 bg-blue-50/50' : 'border-amber-300 bg-amber-50/50'}`} />
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
                  <button onClick={guardarAsistencia} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-sm transition">
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
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-700" /> Historial de Asistencia - IED Topaipí</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Curso</label>
                  <select value={reporteCurso} onChange={(e) => setReporteCurso(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1">
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Asignatura (Opcional)</label>
                  <select value={reporteAsignatura} onChange={(e) => setReporteAsignatura(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1">
                    <option value="">-- Todas las Materias --</option>
                    {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Fecha Inicio</label>
                  <input type="date" value={reporteFechaInicio} onChange={(e) => setReporteFechaInicio(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Fecha Fin</label>
                  <input type="date" value={reporteFechaFin} onChange={(e) => setReporteFechaFin(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1" />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={buscarReporte} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition">Consultar Historial</button>
                {datosReporte.length > 0 && (
                  <button onClick={exportarReporteExcel} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition"><Download className="w-4 h-4" /> Exportar Excel</button>
                )}
                {datosReporte.length > 0 && (
                  <button onClick={limpiarHistorialCompleto} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"><Trash2 className="w-4 h-4" /> Limpiar Historial</button>
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
                        <th className="p-3">Estudiante</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Observación</th>
                        <th className="p-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {datosReporte.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium">{r.fecha}</td>
                          <td className="p-3 font-medium text-emerald-700">{r.asignaturas?.nombre || 'General'}</td>
                          <td className="p-3 font-semibold text-slate-800">{r.estudiantes?.apellidos} {r.estudiantes?.nombres}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.estado === 'Presente' ? 'bg-green-100 text-green-800' : r.estado === 'Llegada Tarde' ? 'bg-blue-100 text-blue-800' : r.estado === 'Ausente' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{r.estado}</span>
                          </td>
                          <td className="p-3 italic text-slate-500">{r.observacion || '-'}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => eliminarRegistroHistorial(r.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition" title="Eliminar registro">
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
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
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-4 overflow-x-auto hide-scrollbar">
              <button onClick={() => setAdminTab('estudiantes')} className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs whitespace-nowrap border-b-2 transition ${adminTab === 'estudiantes' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'}`}><Users className="w-4 h-4" /> Cursos y Estudiantes</button>
              <button onClick={() => setAdminTab('docentes')} className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs whitespace-nowrap border-b-2 transition ${adminTab === 'docentes' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'}`}><GraduationCap className="w-4 h-4" /> Usuarios y Accesos</button>
              <button onClick={() => setAdminTab('carga')} className={`flex items-center gap-2 pb-3 px-2 font-medium text-xs whitespace-nowrap border-b-2 transition ${adminTab === 'carga' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'}`}><Briefcase className="w-4 h-4" /> Carga Académica</button>
            </div>

            {/* TAB: ESTUDIANTES Y CURSOS */}
            {adminTab === 'estudiantes' && (
              <div className="space-y-6">
                
                {/* Modulo Promoción y Deserción */}
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-xl space-y-4">
                  <h2 className="text-md font-bold text-indigo-900 flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-700" /> Promoción y Traslado Masivo (Cierre de Año)
                  </h2>
                  <p className="text-xs text-indigo-700">Traslada a TODOS los estudiantes de un curso hacia otro automáticamente. Ideal para pasar de año.</p>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <label className="text-xs font-semibold uppercase text-indigo-500">Curso Origen</label>
                      <select value={promoOrigen} onChange={(e) => setPromoOrigen(e.target.value)} className="w-full p-2.5 bg-white border border-indigo-300 rounded-lg text-sm font-medium mt-1">
                        <option value="">-- Selecciona --</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <ArrowRightLeft className="w-6 h-6 text-indigo-400 mb-2 hidden md:block" />
                    <div className="flex-1 w-full">
                      <label className="text-xs font-semibold uppercase text-indigo-500">Curso Destino (Siguiente Año)</label>
                      <select value={promoDestino} onChange={(e) => setPromoDestino(e.target.value)} className="w-full p-2.5 bg-white border border-indigo-300 rounded-lg text-sm font-medium mt-1">
                        <option value="">-- Selecciona --</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <button onClick={promoverCursoCompleto} className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm rounded-lg shadow w-full md:w-auto">
                      Ejecutar Promoción
                    </button>
                  </div>
                </div>

                {/* Importar desde Excel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Upload className="w-5 h-5 text-emerald-700" /> Importar Estudiantes desde Excel</h2>
                      <p className="text-xs text-slate-500">Descarga la plantilla, llénala y súbela. (El Documento es opcional).</p>
                    </div>
                    <button onClick={descargarPlantilla} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"><Download className="w-4 h-4" /> Plantilla Excel</button>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center bg-slate-50 hover:bg-emerald-50/30 transition cursor-pointer relative">
                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Haz clic para subir tu plantilla diligenciada</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gestionar Cursos */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-emerald-700" /> Gestionar Cursos</h2>
                    <form onSubmit={crearCurso} className="space-y-3">
                      <input type="text" placeholder="Ej: 601, Desertores" value={nuevoCurso} onChange={(e) => setNuevoCurso(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm" />
                      <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg">Guardar Curso</button>
                    </form>
                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Cursos Existentes ({cursos.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {cursos.map(c => (
                          <div key={c.id} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                            <span>{c.nombre}</span>
                            <button type="button" onClick={() => eliminarCurso(c.id, c.nombre)} className="text-red-500 hover:text-red-700 ml-1" title="Eliminar curso"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Registrar Manualmente */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-700" /> Registrar Manualmente</h2>
                    <form onSubmit={registrarEstudianteManual} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Documento (Opcional)" value={nuevoEstudiante.documento} onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, documento: e.target.value })} className="p-2 bg-slate-50 border rounded-lg text-xs" />
                        <select value={nuevoEstudiante.curso_id} onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, curso_id: e.target.value })} className="p-2 bg-slate-50 border rounded-lg text-xs">
                          <option value="">-- Curso --</option>
                          {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nombres" required value={nuevoEstudiante.nombres} onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, nombres: e.target.value })} className="p-2 bg-slate-50 border rounded-lg text-xs" />
                        <input type="text" placeholder="Apellidos" required value={nuevoEstudiante.apellidos} onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, apellidos: e.target.value })} className="p-2 bg-slate-50 border rounded-lg text-xs" />
                      </div>
                      <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg">Registrar Estudiante</button>
                    </form>
                  </div>
                </div>

                {/* Edición de Estudiante */}
                {editandoEstudiante && (
                  <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-amber-900 text-xs uppercase flex items-center gap-1"><Edit3 className="w-4 h-4" /> Editando Estudiante: {editandoEstudiante.nombres} {editandoEstudiante.apellidos}</h3>
                      <button onClick={() => setEditandoEstudiante(null)} className="text-slate-500 hover:text-slate-700"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={guardarEdicionEstudiante} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <input type="text" placeholder="Documento" value={editandoEstudiante.documento} onChange={(e) => setEditandoEstudiante({ ...editandoEstudiante, documento: e.target.value })} className="p-2 bg-white border rounded-lg text-xs" />
                      <input type="text" placeholder="Nombres" value={editandoEstudiante.nombres} onChange={(e) => setEditandoEstudiante({ ...editandoEstudiante, nombres: e.target.value })} className="p-2 bg-white border rounded-lg text-xs md:col-span-1" />
                      <input type="text" placeholder="Apellidos" value={editandoEstudiante.apellidos} onChange={(e) => setEditandoEstudiante({ ...editandoEstudiante, apellidos: e.target.value })} className="p-2 bg-white border rounded-lg text-xs md:col-span-1" />
                      <select value={editandoEstudiante.curso_id} onChange={(e) => setEditandoEstudiante({ ...editandoEstudiante, curso_id: e.target.value })} className="p-2 bg-white border rounded-lg text-xs font-bold text-emerald-800">
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      <button type="submit" className="py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm">Guardar</button>
                    </form>
                  </div>
                )}

                {/* Lista Estudiantes */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Ver y Editar Estudiantes en el curso ({estudiantes.length})</h3>
                    <select value={selectedCurso} onChange={(e) => setSelectedCurso(e.target.value)} className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium">
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
                          <button onClick={() => setEditandoEstudiante(est)} className="px-3 py-1 bg-amber-100 text-amber-800 font-semibold rounded hover:bg-amber-200 transition">Editar / Mover</button>
                          <button onClick={() => eliminarEstudiante(est.id, `${est.nombres} ${est.apellidos}`)} className="p-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USUARIOS Y ACCESOS */}
            {adminTab === 'docentes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Crear Cuenta */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-700" /> Crear Cuenta de Acceso</h2>
                  <form onSubmit={registrarUsuarioAcceso} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Rol de Usuario</label>
                      <select value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs mt-1 font-semibold text-emerald-800">
                        <option value="docente">Docente</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    {nuevoUsuario.rol === 'docente' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nombres" value={nuevoUsuario.nombres} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombres: e.target.value })} className="p-2 bg-slate-50 border rounded-lg text-xs" />
                        <input type="text" placeholder="Apellidos" value={nuevoUsuario.apellidos} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, apellidos: e.target.value })} className="p-2 bg-slate-50 border rounded-lg text-xs" />
                      </div>
                    )}
                    <input type="text" placeholder="Nombre de Usuario (Ej: admin2 o docente1)" value={nuevoUsuario.usuario} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, usuario: e.target.value })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-mono" />
                    <input type="password" placeholder="Asignar Contraseña" value={nuevoUsuario.password} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                    <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm">Crear Cuenta {nuevoUsuario.rol === 'admin' ? 'de Administrador' : 'de Docente'}</button>
                  </form>
                </div>

                {/* Lista y Edición de Cuentas */}
                <div className="space-y-4">
                  {editandoPerfil && (
                    <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-amber-900 text-xs uppercase flex items-center gap-1"><Edit3 className="w-4 h-4" /> Editando Usuario: {editandoPerfil.usuario}</h3>
                        <button onClick={() => setEditandoPerfil(null)} className="text-slate-500 hover:text-slate-700"><X className="w-4 h-4" /></button>
                      </div>
                      <form onSubmit={guardarEdicionPerfil} className="space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-amber-800 uppercase font-bold">Usuario de Acceso</label>
                            <input type="text" value={editandoPerfil.usuario} onChange={(e) => setEditandoPerfil({...editandoPerfil, usuario: e.target.value})} className="w-full p-2 bg-white border rounded text-xs mt-1" />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-amber-800 uppercase font-bold">Rol</label>
                            <select value={editandoPerfil.rol} onChange={(e) => setEditandoPerfil({...editandoPerfil, rol: e.target.value})} className="w-full p-2 bg-white border rounded text-xs mt-1">
                              <option value="admin">Administrador</option>
                              <option value="docente">Docente</option>
                            </select>
                          </div>
                        </div>
                        {editandoPerfil.docentes && (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-amber-800 uppercase font-bold">Nombres (Docente)</label>
                              <input type="text" value={editandoPerfil.docentes.nombres} onChange={(e) => setEditandoPerfil({...editandoPerfil, docentes: {...editandoPerfil.docentes, nombres: e.target.value}})} className="w-full p-2 bg-white border rounded text-xs mt-1" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-amber-800 uppercase font-bold">Apellidos (Docente)</label>
                              <input type="text" value={editandoPerfil.docentes.apellidos} onChange={(e) => setEditandoPerfil({...editandoPerfil, docentes: {...editandoPerfil.docentes, apellidos: e.target.value}})} className="w-full p-2 bg-white border rounded text-xs mt-1" />
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-amber-700 mt-2 font-medium bg-amber-100 p-2 rounded">Seguridad Supabase: Para cambiar contraseña de OTRO usuario, el administrador debe recrear la cuenta o usar el panel backend.</p>
                        <button type="submit" className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm">Guardar Datos de Perfil</button>
                      </form>
                    </div>
                  )}

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
                    <h2 className="text-md font-bold text-slate-800">Cuentas Registradas ({todosPerfiles.length})</h2>
                    <div className="divide-y max-h-[400px] overflow-y-auto pr-2">
                      {todosPerfiles.map(p => (
                        <div key={p.id} className="py-2.5 text-xs flex justify-between items-center hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{p.usuario}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{p.rol === 'admin' ? 'ADMINISTRADOR' : 'DOCENTE'}</span>
                            </div>
                            {p.docentes && <p className="text-slate-500 mt-0.5">{p.docentes.apellidos} {p.docentes.nombres}</p>}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditandoPerfil(p)} className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition" title="Editar información"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => eliminarPerfilUsuario(p.id, p.usuario)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition" title="Eliminar acceso"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CARGA ACADÉMICA Y ASIGNATURAS */}
            {adminTab === 'carga' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <h2 className="text-md font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-700" /> Asignar Carga Académica</h2>
                  <form onSubmit={asignarCarga} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Docente</label>
                      <select value={nuevaCarga.docente_id} onChange={(e) => setNuevaCarga({ ...nuevaCarga, docente_id: e.target.value })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs mt-1">
                        <option value="">-- Seleccionar Docente --</option>
                        {docentes.map(d => <option key={d.id} value={d.id}>{d.apellidos} {d.nombres}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Curso</label>
                      <select value={nuevaCarga.curso_id} onChange={(e) => setNuevaCarga({ ...nuevaCarga, curso_id: e.target.value })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs mt-1">
                        <option value="">-- Seleccionar Curso --</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Asignatura</label>
                      <select value={nuevaCarga.asignatura_id} onChange={(e) => setNuevaCarga({ ...nuevaCarga, asignatura_id: e.target.value })} className="w-full p-2 bg-slate-50 border rounded-lg text-xs mt-1">
                        <option value="">-- Seleccionar Asignatura --</option>
                        {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg">Asignar Carga</button>
                  </form>

                  <div className="pt-4 border-t space-y-3">
                    <p className="text-xs font-semibold text-slate-600">Gestión de Asignaturas:</p>
                    {editandoAsignatura ? (
                      <form onSubmit={guardarEdicionAsignatura} className="flex gap-2">
                        <input type="text" value={editandoAsignatura.nombre} onChange={(e) => setEditandoAsignatura({ ...editandoAsignatura, nombre: e.target.value })} className="p-2 bg-white border border-amber-300 rounded-lg text-xs flex-1" />
                        <button type="submit" className="px-3 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg">Guardar</button>
                        <button type="button" onClick={() => setEditandoAsignatura(null)} className="px-2 py-2 text-slate-500"><X className="w-4 h-4" /></button>
                      </form>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Ej: Matemáticas" value={nuevaAsignatura} onChange={(e) => setNuevaAsignatura(e.target.value)} className="p-2 bg-slate-50 border rounded-lg text-xs flex-1" />
                        <button type="button" onClick={crearAsignatura} className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition">Crear</button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {asignaturas.map(a => (
                        <div key={a.id} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">
                          <span>{a.nombre}</span>
                          <button onClick={() => setEditandoAsignatura(a)} className="text-amber-600 hover:text-amber-800 ml-1"><Edit3 className="w-3 h-3" /></button>
                          <button onClick={() => eliminarAsignatura(a.id, a.nombre)} className="text-red-600 hover:text-red-800"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
                  <h2 className="text-md font-bold text-slate-800">Cargas Académicas Asignadas ({cargas.length})</h2>
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {cargas.map(cg => (
                      <div key={cg.id} className="py-2 text-xs flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <p className="font-semibold text-slate-800">{cg.docentes?.apellidos} {cg.docentes?.nombres}</p>
                          <p className="text-emerald-700 font-medium">Curso: {cg.cursos?.nombre} | Materia: {cg.asignaturas?.nombre}</p>
                        </div>
                        <button onClick={() => eliminarCarga(cg.id)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded" title="Quitar esta carga"><Trash2 className="w-3.5 h-3.5" /></button>
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
