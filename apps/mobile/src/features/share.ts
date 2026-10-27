import { Share } from 'react-native';
import { WEB_URL } from '@/config';

export function shareOpportunity(id: string, title: string) {
  const url = `${WEB_URL}/opportunities/${id}`;
  void Share.share({ message: `${title}: ${url}`, url, title });
}
