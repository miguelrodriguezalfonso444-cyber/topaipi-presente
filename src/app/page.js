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
  Clock, 
  Save, 
  Calendar, 
  Trash2, 
  Edit3, 
  Search, 
  Users, 
  BookOpen, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Award,
  BarChart2,
  Settings,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('docente');
  const [userRole, setUserRole] = useState('docente');
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [observaciones, setObservaciones] = useState({});
  const [llegadasTarde, setLlegadasTarde] = useState({});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estado para la gestión de usuarios y accesos (Administrador)
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({ documento: '', nombre: '', rol: 'docente', pin: '' });

  // Estados para Carga Académica y otras pestañas
  const [nuevoCursoNombre, setNuevoCursoNombre] = useState('');
  const [estudianteManual, setEstudianteManual] = useState({ documento: '', nombres: '', apellidos: '', curso_id: '' });

  useEffect(() => {
    cargarDatosBasicos();
  }, []);

  const cargarDatosBasicos = async () => {
    setLoading(true);
    try {
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (cursosError) throw cursosError;
      setCursos(cursosData || []);

      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*');
      
      if (usuariosError) throw usuariosError;
      setUsuarios(usuariosData || []);

    } catch (error) {
      console.error('Error cargando datos básicos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstudiantesYAsistencia = async (cursoId) => {
    if (!cursoId) return;
    setLoading(true);
    try {
      const { data: estudiantesData, error: estudiantesError } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('curso_id', cursoId)
        .order('apellidos', { ascending: true });

      if (estudiantesError) throw estudiantesError;
      setEstudiantes(estudiantesData || []);

      const hoy = new Date().toISOString().split('T')[0];
      const { data: asistenciaData, error: asistenciaError } = await supabase
        .from('asistencia')
        .select('*')
        .eq('fecha', hoy)
        .eq('curso_id', cursoId);

      if (asistenciaError) throw asistenciaError;

      const asistenciaMap = {};
      const observacionesMap = {};
      const llegadasTardeMap = {};

      asistenciaData.forEach(item => {
        asistenciaMap[item.estudiante_id] = item.estado;
        observacionesMap[item.estudiante_id] = item.observacion || '';
        llegadasTardeMap[item.estudiante_id] = item.llegada_tarde || false;
      });

      setAsistencia(asistenciaMap);
      setObservaciones(observacionesMap);
      setLlegadasTarde(llegadasTardeMap);

    } catch (error) {
      console.error('Error cargando estudiantes y asistencia:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarAsistenciaTotal = async () => {
    if (!cursoSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Por favor seleccione un curso.' });
      return;
    }

    setLoading(true);
    const hoy = new Date().toISOString().split('T')[0];

    try {
      const registros = estudiantes.map(est => ({
        estudiante_id: est.id,
        curso_id: cursoSeleccionado,
        fecha: hoy,
        estado: asistencia[est.id] || 'Presente',
        observacion: observaciones[est.id] || '',
        llegada_tarde: llegadasTarde[est.id] || false
      }));

      for (let reg of registros) {
        const { data: existente } = await supabase
          .from('asistencia')
          .select('id')
          .eq('estudiante_id', reg.estudiante_id)
          .eq('fecha', hoy)
          .single();

        if (existente) {
          await supabase
            .from('asistencia')
            .update({
              estado: reg.estado,
              observacion: reg.observacion,
              llegada_tarde: reg.llegada_tarde
            })
            .eq('id', existente.id);
        } else {
          await supabase.from('asistencia').insert([reg]);
        }
      }

      setMensaje({ tipo: 'exito', texto: '¡Asistencia guardada correctamente!' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Error al guardar asistencia:', error.message);
      setMensaje({ tipo: 'error', texto: 'Error al guardar la asistencia.' });
    } finally {
      setLoading(false);
    }
  };

  const crearCurso = async (e) => {
    e.preventDefault();
    if (!nuevoCursoNombre.trim()) return;
    try {
      const { error } = await supabase.from('cursos').insert([{ nombre: nuevoCursoNombre.trim() }]);
      if (error) throw error;
      setNuevoCursoNombre('');
      cargarDatosBasicos();
      setMensaje({ tipo: 'exito', texto: '¡Curso creado con éxito!' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Error al crear curso:', error.message);
      setMensaje({ tipo: 'error', texto: 'Error al crear el curso.' });
    }
  };

  const registrarEstudianteManual = async (e) => {
    e.preventDefault();
    if (!estudianteManual.documento || !estudianteManual.nombres || !estudianteManual.apellidos || !estudianteManual.curso_id) {
      setMensaje({ tipo: 'error', texto: 'Complete todos los campos del estudiante.' });
      return;
    }
    try {
      const { error } = await supabase.from('estudiantes').insert([estudianteManual]);
      if (error) throw error;
      setEstudianteManual({ documento: '', nombres: '', apellidos: '', curso_id: '' });
      setMensaje({ tipo: 'exito', texto: '¡Estudiante registrado correctamente!' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Error al registrar estudiante:', error.message);
      setMensaje({ tipo: 'error', texto: 'Error al registrar estudiante.' });
    }
  };

  const registrarUsuario = async (e) => {
    e.preventDefault();
    if (!nuevoUsuario.documento || !nuevoUsuario.nombre || !nuevoUsuario.pin) {
      setMensaje({ tipo: 'error', texto: 'Complete todos los campos del usuario.' });
      return;
    }
    try {
      const { error } = await supabase.from('usuarios').insert([nuevoUsuario]);
      if (error) throw error;
      setNuevoUsuario({ documento: '', nombre: '', rol: 'docente', pin: '' });
      cargarDatosBasicos();
      setMensaje({ tipo: 'exito', texto: '¡Usuario registrado correctamente!' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Error al registrar usuario:', error.message);
      setMensaje({ tipo: 'error', texto: 'Error al registrar usuario.' });
    }
  };

  const eliminarUsuario = async (id) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
      cargarDatosBasicos();
      setMensaje({ tipo: 'exito', texto: 'Usuario eliminado.' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Error al eliminar usuario:', error.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white shadow rounded-lg p-6 mb-6 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Topaipí Presente</h1>
            <p className="text-sm text-gray-500">IED Topaipí • Rol: Admin (admin)</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button 
              onClick={() => setActiveTab('docente')} 
              className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'docente' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Vista Docente
            </button>
            <button 
              onClick={() => setActiveTab('historial')} 
              className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'historial' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Historial y Reportes
            </button>
            <button 
              onClick={() => setActiveTab('admin')} 
              className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'admin' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Administrador
            </button>
          </div>
        </header>

        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded-lg text-white font-medium ${mensaje.tipo === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
            {mensaje.texto}
          </div>
        )}

        {activeTab === 'docente' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" /> Control de Asistencia Diaria
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Curso:</label>
              <select 
                className="w-full md:w-1/3 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                value={cursoSeleccionado}
                onChange={(e) => {
                  setCursoSeleccionado(e.target.value);
                  cargarEstudiantesYAsistencia(e.target.value);
                }}
              >
                <option value="">-- Seleccione un curso --</option>
                {cursos.map(curso => (
                  <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="text-center py-8 text-gray-500">Cargando datos...</p>
            ) : cursoSeleccionado && estudiantes.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Llegada Tarde</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {estudiantes.map((est) => (
                        <tr key={est.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {est.apellidos}, {est.nombres}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <select 
                              className="p-1 border rounded text-sm font-medium"
                              value={asistencia[est.id] || 'Presente'}
                              onChange={(e) => setAsistencia({...asistencia, [est.id]: e.target.value})}
                            >
                              <option value="Presente">Presente</option>
                              <option value="Ausente">Ausente</option>
                              <option value="Excusa">Excusa</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                              checked={llegadasTarde[est.id] || false}
                              onChange={(e) => setLlegadasTarde({...llegadasTarde, [est.id]: e.target.checked})}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input 
                              type="text"
                              className="w-full p-1 border rounded text-sm"
                              placeholder="Observación opcional..."
                              value={observaciones[est.id] || ''}
                              onChange={(e) => setObservaciones({...observaciones, [est.id]: e.target.value})}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={guardarAsistenciaTotal}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow transition flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Guardar Asistencia
                  </button>
                </div>
              </div>
            ) : cursoSeleccionado ? (
              <p className="text-center py-8 text-gray-500">No hay estudiantes registrados en este curso.</p>
            ) : (
              <p className="text-center py-8 text-gray-500">Seleccione un curso para comenzar.</p>
            )}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" /> Historial y Reportes
            </h2>
            <p className="text-gray-600">Consulta de reportes de asistencia históricos por fecha y curso.</p>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-600" /> Panel de Administración y Accesos
            </h2>
            
            <div className="flex gap-4 mb-6 border-b pb-4">
              <button className="text-green-600 font-semibold border-b-2 border-green-600 pb-1">Cursos y Estudiantes</button>
              <button className="text-gray-500 hover:text-gray-700 pb-1">Transición de Año</button>
              <button className="text-gray-500 hover:text-gray-700 pb-1">Usuarios y Accesos</button>
              <button className="text-gray-500 hover:text-gray-700 pb-1">Carga Académica</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="border p-4 rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-green-600" /> Crear / Gestionar Cursos
                </h3>
                <form onSubmit={crearCurso} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ej: 601, 901"
                    className="p-2 border rounded flex-1 text-sm"
                    value={nuevoCursoNombre}
                    onChange={(e) => setNuevoCursoNombre(e.target.value)}
                  />
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
                    Guardar Curso
                  </button>
                </form>
              </div>

              <div className="border p-4 rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-600" /> Registrar Estudiante Manualmente
                </h3>
                <form onSubmit={registrarEstudianteManual} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="Documento" 
                      className="p-2 border rounded text-sm"
                      value={estudianteManual.documento}
                      onChange={(e) => setEstudianteManual({...estudianteManual, documento: e.target.value})}
                    />
                    <select 
                      className="p-2 border rounded text-sm"
                      value={estudianteManual.curso_id}
                      onChange={(e) => setEstudianteManual({...estudianteManual, curso_id: e.target.value})}
                    >
                      <option value="">-- Seleccionar Curso --</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nombres" 
                    className="w-full p-2 border rounded text-sm"
                    value={estudianteManual.nombres}
                    onChange={(e) => setEstudianteManual({...estudianteManual, nombres: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Apellidos" 
                    className="w-full p-2 border rounded text-sm"
                    value={estudianteManual.apellidos}
                    onChange={(e) => setEstudianteManual({...estudianteManual, apellidos: e.target.value})}
                  />
                  <button type="submit" className="w-full bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700">
                    Registrar Estudiante
                  </button>
                </form>
              </div>
            </div>

            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" /> Gestión de Usuarios ({usuarios.length})
              </h3>
              <form onSubmit={registrarUsuario} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="Documento" 
                  className="p-2 border rounded text-sm"
                  value={nuevoUsuario.documento}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, documento: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Nombre completo" 
                  className="p-2 border rounded text-sm"
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})}
                />
                <select 
                  className="p-2 border rounded text-sm"
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})}
                >
                  <option value="docente">Docente</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    placeholder="PIN" 
                    className="p-2 border rounded text-sm w-full"
                    value={nuevoUsuario.pin}
                    onChange={(e) => setNuevoUsuario({...nuevoUsuario, pin: e.target.value})}
                  />
                  <button type="submit" className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700">Agregar</button>
                </div>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {usuarios.map(u => (
                  <div key={u.id} className="bg-white p-3 rounded border flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-gray-800">{u.nombre}</p>
                      <p className="text-xs text-gray-500">Doc: {u.documento} | Rol: <span className="uppercase text-green-700 font-bold">{u.rol}</span></p>
                    </div>
                    <button onClick={() => eliminarUsuario(u.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
