'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Save, Settings, PlusCircle, UserPlus, Trash2, FileText } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('docente');
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [observaciones, setObservaciones] = useState({});
  const [llegadasTarde, setLlegadasTarde] = useState({});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    cargarDatosBasicos();
  }, []);

  const cargarDatosBasicos = async () => {
    setLoading(true);
    try {
      const { data: cursosData } = await supabase.from('cursos').select('*').order('nombre', { ascending: true });
      setCursos(cursosData || []);
      const { data: usuariosData } = await supabase.from('usuarios').select('*');
      setUsuarios(usuariosData || []);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstudiantesYAsistencia = async (cursoId) => {
    if (!cursoId) return;
    setLoading(true);
    try {
      const { data: estudiantesData } = await supabase.from('estudiantes').select('*').eq('curso_id', cursoId).order('apellidos', { ascending: true });
      setEstudiantes(estudiantesData || []);
      
      const hoy = new Date().toISOString().split('T')[0];
      const { data: asistenciaData } = await supabase.from('asistencia').select('*').eq('fecha', hoy).eq('curso_id', cursoId);

      const asistenciaMap = {};
      const observacionesMap = {};
      const llegadasTardeMap = {};

      asistenciaData?.forEach(item => {
        asistenciaMap[item.estudiante_id] = item.estado;
        observacionesMap[item.estudiante_id] = item.observacion || '';
        llegadasTardeMap[item.estudiante_id] = item.llegada_tarde || false;
      });

      setAsistencia(asistenciaMap);
      setObservaciones(observacionesMap);
      setLlegadasTarde(llegadasTardeMap);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarAsistenciaTotal = async () => {
    if (!cursoSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Seleccione un curso.' });
      return;
    }
    setLoading(true);
    const hoy = new Date().toISOString().split('T')[0];
    try {
      for (let est of estudiantes) {
        const reg = {
          estudiante_id: est.id,
          curso_id: cursoSeleccionado,
          fecha: hoy,
          estado: asistencia[est.id] || 'Presente',
          observacion: observaciones[est.id] || '',
          llegada_tarde: llegadasTarde[est.id] || false
        };

        const { data: existente } = await supabase.from('asistencia').select('id').eq('estudiante_id', reg.estudiante_id).eq('fecha', hoy).single();

        if (existente) {
          await supabase.from('asistencia').update({ estado: reg.estado, observacion: reg.observacion, llegada_tarde: reg.llegada_tarde }).eq('id', existente.id);
        } else {
          await supabase.from('asistencia').insert([reg]);
        }
      }
      setMensaje({ tipo: 'exito', texto: '¡Asistencia guardada correctamente!' });
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white shadow rounded-lg p-6 mb-6 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Topaipí Presente</h1>
            <p className="text-sm text-gray-500">IED Topaipí • Control de Asistencia</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button onClick={() => setActiveTab('docente')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'docente' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Vista Docente</button>
            <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'admin' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Administrador</button>
          </div>
        </header>

        {mensaje.texto && (
          <div className={`p-4 mb-6 rounded-lg text-white font-medium ${mensaje.tipo === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{mensaje.texto}</div>
        )}

        {activeTab === 'docente' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" /> Control de Asistencia Diaria
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Curso:</label>
              <select className="w-full md:w-1/3 p-2 border border-gray-300 rounded-lg" value={cursoSeleccionado} onChange={(e) => { setCursoSeleccionado(e.target.value); cargarEstudiantesYAsistencia(e.target.value); }}>
                <option value="">-- Seleccione un curso --</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {loading ? <p className="text-center py-8 text-gray-500">Cargando...</p> : cursoSeleccionado && estudiantes.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiante</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Llegada Tarde</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {estudiantes.map(est => (
                        <tr key={est.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{est.apellidos}, {est.nombres}</td>
                          <td className="px-6 py-4 text-center">
                            <select className="p-1 border rounded text-sm" value={asistencia[est.id] || 'Presente'} onChange={(e) => setAsistencia({...asistencia, [est.id]: e.target.value})}>
                              <option value="Presente">Presente</option>
                              <option value="Ausente">Ausente</option>
                              <option value="Excusa">Excusa</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input type="checkbox" className="w-4 h-4 text-green-600 rounded" checked={llegadasTarde[est.id] || false} onChange={(e) => setLlegadasTarde({...llegadasTarde, [est.id]: e.target.checked})} />
                          </td>
                          <td className="px-6 py-4">
                            <input type="text" className="w-full p-1 border rounded text-sm" placeholder="Opcional..." value={observaciones[est.id] || ''} onChange={(e) => setObservaciones({...observaciones, [est.id]: e.target.value})} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={guardarAsistenciaTotal} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow flex items-center gap-2">
                    <Save className="w-5 h-5" /> Guardar Asistencia
                  </button>
                </div>
              </div>
            ) : cursoSeleccionado ? <p className="text-center py-8 text-gray-500">No hay estudiantes en este curso.</p> : <p className="text-center py-8 text-gray-500">Seleccione un curso.</p>}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-600" /> Administración
            </h2>
            <p className="text-sm text-gray-600 mb-4">Usuarios registrados en el sistema: {usuarios.length}</p>
            <div className="space-y-2">
              {usuarios.map(u => (
                <div key={u.id} className="p-3 border rounded flex justify-between items-center text-sm">
                  <span>{u.nombre} ({u.rol})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
