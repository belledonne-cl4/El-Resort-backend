import Retiro from "../models/Retiros";

type CreateRetiroInput = {
  nombre: string;
  descripcion: string;
  duracionNoches: number;
  fechaInicio: Date;
  fechaFin: Date;
  idealPara: string;
  cuposMaximos: number;
  imagen: string;
  incluye: {
    yoga: boolean;
    comidasPorDia: number;
    masajesIncluidos: boolean;
    trasladoIncluido: boolean;
  };
  actividades: {
    dia: number;
    actividadesDelDia: string[];
  }[];
  precioPorPersona: number;
  disponible: boolean;
  fechaRegistro?: Date;
};

export const RetirosService = {
  async create(data: Partial<CreateRetiroInput>) {
    const created = await Retiro.create(data);
    return created;
  },

  async listAll() {
    return Retiro.find({}).sort({ fechaInicio: 1 });
  },

  async getById(id: string) {
    return Retiro.findById(id);
  },

  async updateById(id: string, data: Partial<CreateRetiroInput>) {
    return Retiro.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async deleteById(id: string) {
    return Retiro.findByIdAndDelete(id);
  },
};
